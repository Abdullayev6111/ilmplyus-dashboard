import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import LoginPage from './pages/login';
import '@mantine/core/styles.css';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
};

export default App;
