# 区块链商户认证系统E-R图

## 系统实体关系图

```mermaid
entityRelationship
    %% 定义实体
    MERCHANT[商户] {
        merchantId 商户ID (PK)
        name 商户名称
        description 商户描述
        metadataURI 元数据URI
        isActive 活跃状态
        reputationScore 信誉分数
        owner 所有者地址
        isApproved 审核状态
    }
    
    USER[用户] {
        address 用户地址 (PK)
        role 角色类型
        registrationDate 注册日期
        lastLoginDate 最后登录日期
    }
    
    ADMIN[管理员] {
        address 管理员地址 (PK)
        role 角色权限
        appointmentDate 任命日期
    }
    
    CERTIFICATE[证书] {
        tokenId 证书ID (PK)
        merchantId 商户ID (FK)
        certificateNumber 证书编号
        issueDate 发行日期
        expiryDate 到期日期
        ipfsHash IPFS哈希
        status 证书状态
        revokeReason 撤销原因
    }
    
    %% 定义关系
    %% 商户与用户的关系
    MERCHANT ||--o{ USER : 拥有
    
    %% 管理员与商户的关系
    ADMIN ||--o{ MERCHANT : 审核
    
    %% 商户与证书的关系
    MERCHANT ||--o{ CERTIFICATE : 持有
    
    %% 管理员与证书的关系
    ADMIN ||--o{ CERTIFICATE : 管理
    
    %% 用户与证书的关系
    USER ||--o{ CERTIFICATE : 验证
```

## E-R图说明

### 实体说明

1. **商户(MERCHANT)**
   - 主键：merchantId (商户ID)
   - 属性：
     - name：商户名称
     - description：商户描述
     - metadataURI：元数据URI，指向IPFS上的详细信息
     - isActive：活跃状态，表示商户是否处于活跃状态
     - reputationScore：信誉分数，表示商户的信誉评级
     - owner：所有者地址，关联到用户实体
     - isApproved：审核状态，表示商户是否通过审核

2. **用户(USER)**
   - 主键：address (用户区块链地址)
   - 属性：
     - role：角色类型，区分普通用户和商户用户
     - registrationDate：注册日期
     - lastLoginDate：最后登录日期

3. **管理员(ADMIN)**
   - 主键：address (管理员区块链地址)
   - 属性：
     - role：角色权限，管理员的权限级别
     - appointmentDate：任命日期

4. **证书(CERTIFICATE)**
   - 主键：tokenId (证书ID，即NFT的唯一标识)
   - 外键：merchantId (关联到商户实体)
   - 属性：
     - certificateNumber：证书编号，格式为MCHT-YY-XXXXXX
     - issueDate：发行日期
     - expiryDate：到期日期
     - ipfsHash：IPFS哈希，指向证书元数据
     - status：证书状态（有效、过期、已撤销）
     - revokeReason：撤销原因（如果已撤销）

### 关系说明

1. **拥有关系**：商户与用户之间是一对多关系，一个用户可以拥有多个商户身份。

2. **审核关系**：管理员与商户之间是一对多关系，管理员负责审核多个商户。

3. **持有关系**：商户与证书之间是一对多关系，一个商户可以持有多个证书（如不同类型的认证或更新后的证书）。

4. **管理关系**：管理员与证书之间是一对多关系，管理员负责管理（铸造、撤销、续期）多个证书。

5. **验证关系**：用户与证书之间是一对多关系，用户可以验证多个证书的有效性。

## 技术实现关联

本E-R图与系统的智能合约实现紧密关联：

1. **MerchantManager合约**：实现商户实体的管理，包括商户的创建、审核、更新和状态管理。

2. **MerchantNFT合约**：实现证书实体的管理，基于ERC-721标准，负责证书的铸造、验证、撤销和续期。

3. **访问控制机制**：通过智能合约的权限控制，实现用户、商户和管理员之间的关系管理。

4. **事件机制**：通过智能合约事件，记录实体状态变化，如商户审核、证书铸造等操作。

通过区块链技术，系统确保了实体关系的不可篡改性和透明性，为商户认证提供了可信的技术基础。