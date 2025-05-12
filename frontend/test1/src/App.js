import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import MerchantManager2 from "./components/test";
import AdminPanel from "./components/AdminPanel";
import MerchantDetail from './components/MerchantDetail';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<MerchantManager2 />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/merchant/:id" element={<MerchantDetail />} />
            </Routes>
        </Router>
    );
};

export default App;