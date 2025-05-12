import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Card, message, Modal, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';


const MerchantManager = () => {
    const [merchants, setMerchants] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [currentMerchant, setCurrentMerchant] = useState(null);
    const [form] = Form.useForm();
    const [imageFileList, setImageFileList] = useState([]); // 管理文件列表
    const [imageFile, setImageFile] = useState(null); // 存储单个文件

    // 表格列定义
    const columns = [
        {
            title: '商户名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '联系电话',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: '钱包地址',
            dataIndex: 'Wallet Address',
            key: 'Wallet Address',
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Button type="link" onClick={() => handleView(record)}>
                    查看详情
                </Button>
            ),
        },
    ];

    // 创建商户
    const handleCreate = async (values) => {
        try {
            const { attribute1, attribute2, ...filteredValues } = values;

            // 如果有图片文件，上传到 Pinata
            let imageUrl = '';
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);

                const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                    method: 'POST',
                    headers: {
                        pinata_api_key: '786de8fb04079b8ae9f5', // 替换为你的 API Key
                        pinata_secret_api_key: 'b5b73015c744165cb83ba7867316cc30041573beb5a7b66dcba6170184ade198', // 替换为你的 API Secret
                    },
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('图片上传失败');
                }

                const data = await response.json();
                imageUrl = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`; // 获取图片的 IPFS URL
            }
            
            // 获取最新的 CID
            const latestCid = await fetchLatestCid(); // 获取最新的 CID
            const fileResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${latestCid}`); // 使用 CID 查询商户列表
            if (!fileResponse.ok) {
                throw new Error('网络响应失败');
            }

            // 获取现有商户数据
            const existingData = await fileResponse.json();

            // 计算新商户的 id（继承现有最大 id 并递增）
            const maxId = existingData.reduce((max, merchant) => Math.max(max, merchant.id || 0), 0);
            const newId = maxId + 1;

            // 将表单数据与图片 URL 和 id 一起提交
            const newMerchant = {
                id: newId, // 添加递增的 id
                ...filteredValues,
                image: imageUrl,
                attributes: [
                    {
                        trait_type: "属性1",
                        value: values.attribute1,
                    },
                    {
                        trait_type: "属性2",
                        value: values.attribute2,
                    },
                ],
            };

            console.log('提交的商户数据:', newMerchant);

            // 将新商户数据添加到现有数据中
            const updatedData = [...existingData, newMerchant];

            // 上传更新后的文件到 Pinata
            const updatedFile = new Blob([JSON.stringify(updatedData, null, 2)], { type: 'application/json' });
            const formData = new FormData();
            formData.append('file', updatedFile);
            formData.append(
                'pinataMetadata',
                JSON.stringify({
                    name: '商户信息.json', // 设置文件名称
                })
            );

            const uploadResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                method: 'POST',
                headers: {
                    pinata_api_key: '786de8fb04079b8ae9f5', // 替换为你的 API Key
                    pinata_secret_api_key: 'b5b73015c744165cb83ba7867316cc30041573beb5a7b66dcba6170184ade198', // 替换为你的 API Secret
                },
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('更新文件上传失败');
            }

            const uploadData = await uploadResponse.json();
            console.log('更新后的文件已上传:', uploadData);

            // 使用新的 CID 刷新商户列表
            const newCid = uploadData.IpfsHash; // 获取新的 CID
            fetchMerchants(newCid); // 使用新的 CID 查询商户列表

            message.success('商户创建成功');
            setIsModalVisible(false);
            form.resetFields();
            setImageFile(null); // 清空图片状态
        } catch (error) {
            console.error('创建失败:', error);
            message.error('创建失败');
        }
    };

    // 查询商户列表
    const fetchMerchants = async (cid = 'bafkreie6bbzqn6wqnoo2gacg4kryjxijhw6rcviov7app34kuyerwczzha') => {
        try {
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`); // 使用 CID 查询商户列表
            if (!response.ok) {
                throw new Error('网络响应失败');
            }
            const data = await response.json(); // 假设返回的是商户列表的 JSON 数据
            // 为每个商户生成唯一的 id（如果后端没有提供）
            const merchantsWithId = data.map((merchant, index) => ({
                ...merchant,
                id: merchant.id || index, // 如果没有 id，则使用索引作为 id
            }));
            setMerchants(merchantsWithId); // 假设 JSON 数据中有 merchants 字段
        } catch (error) {
            message.error('获取商户列表失败');
            console.error('Error fetching merchants:', error);
        }
    };

    const handleView = (record) => {
        setCurrentMerchant({
            ...record,
            licenseUrl: record.image || 'https://example.com', // 默认值或从数据中获取
        });
        setIsViewModalVisible(true);
    };

    // 获取最新的 CID
    // 这个函数可以在需要时调用，例如在组件加载时或在创建商户后
    const fetchLatestCid = async () => {
        try {
            const pinListResponse = await fetch('https://api.pinata.cloud/data/pinList?status=pinned', {
                method: 'GET',
                headers: {
                    pinata_api_key: '786de8fb04079b8ae9f5', // 替换为你的 API Key
                    pinata_secret_api_key: 'b5b73015c744165cb83ba7867316cc30041573beb5a7b66dcba6170184ade198', // 替换为你的 API Secret
                },
            });
    
            if (!pinListResponse.ok) {
                throw new Error('获取最新文件失败');
            }
    
            const pinListData = await pinListResponse.json();
            const latestFile = pinListData.rows.find((file) => file.metadata.name === '商户信息.json'); // 替换为你的文件名称
            if (!latestFile) {
                throw new Error('未找到最新的 JSON 文件');
            }
    
            return latestFile.ipfs_pin_hash; // 返回最新文件的 CID
        } catch (error) {
            console.error('获取最新文件失败:', error);
            throw error;
        }
    };

   

    useEffect(() => {
        const initializeMerchants = async () => {
            try {
                const latestCid = await fetchLatestCid();
                fetchMerchants(latestCid); // 使用最新的 CID 查询商户列表
            } catch (error) {
                console.error('初始化商户列表失败:', error);
            }
        };
    
        initializeMerchants();
    }, []);

    return (
        <div style={{ padding: 24 }}>
            <Card title="商户管理">
                <Button type="primary" onClick={() => setIsModalVisible(true)} style={{ marginBottom: 16 }}>
                    创建商户
                </Button>

                <Table columns={columns} dataSource={merchants} rowKey="id" />

                <Modal
                    title="创建商户"
                    open={isModalVisible}
                    onCancel={() => setIsModalVisible(false)}
                    footer={null}
                >
                    <Form form={form} onFinish={handleCreate} layout="vertical">
                        <Form.Item
                            name="name"
                            label="商户名称"
                            rules={[{ required: true, message: '请输入商户名称' }]}
                        >
                            <Input placeholder="请输入商户名称" />
                        </Form.Item>
                        <Form.Item
                            name="phone"
                            label="联系电话"
                            rules={[{ required: true, message: '请输入联系电话' }]}
                        >
                            <Input placeholder="请输入联系电话" />
                        </Form.Item>
                        <Form.Item
                            name="Wallet Address"
                            label="钱包地址"
                            rules={[{ required: true, message: '请输入钱包地址' }]}
                        >
                            <Input.TextArea placeholder="请输入钱包地址" />
                        </Form.Item>
                        <Form.Item
                            name="image"
                            label="商户图片"
                            rules={[{ required: true, message: '请上传商户图片' }]}
                        >
                            <Upload
                                name="file"
                                listType="picture"
                                maxCount={1}
                                fileList={imageFileList} // 使用 fileList 属性
                                onChange={({ fileList }) => setImageFileList(fileList)} // 更新文件列表
                                beforeUpload={(file) => {
                                    setImageFile(file); // 将文件存储到本地状态
                                    return false; // 阻止自动上传
                                }}
                                accept="image/*"
                            >
                                <Button icon={<UploadOutlined />}>点击上传</Button>
                            </Upload>
                        </Form.Item>
                        <Form.Item
                            name="attribute1"
                            label="经营范围"
                            rules={[{ required: true, message: '请输入经营范围的值' }]}
                        >
                            <Input placeholder="请输入经营范围的值" />
                        </Form.Item>
                        <Form.Item
                            name="attribute2"
                            label="属性2"
                            rules={[{ required: true, message: '请输入属性2的值' }]}
                        >
                            <Input placeholder="请输入属性2的值" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit">
                                提交
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title="商户详情"
                    open={isViewModalVisible}
                    onCancel={() => setIsViewModalVisible(false)}
                    footer={[
                        <Button key="close" onClick={() => setIsViewModalVisible(false)}>
                            关闭
                        </Button>
                    ]}
                >
                    {currentMerchant && (
                        <div>
                            <p><strong>商户名称：</strong> {currentMerchant.name}</p>
                            <p><strong>联系电话：</strong> {currentMerchant.phone}</p>
                            <p><strong>钱包地址：</strong> {currentMerchant.WalletAddress}</p>
                            <p><strong>经营许可：</strong> <a href={currentMerchant.licenseUrl} target="_blank" rel="noopener noreferrer">{currentMerchant.licenseUrl}</a></p>
                        </div>
                    )}
                </Modal>
            </Card>
        </div>
    );
};

export default MerchantManager;
