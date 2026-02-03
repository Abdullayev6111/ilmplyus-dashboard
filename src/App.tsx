import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import LoginPage from './pages/login';
import Layout from './components/Layout';
import Users from './pages/users';
import Settings from './pages/settings';
import Branches from './pages/branches';
import Classes from './pages/classes';
import Students from './pages/students';
import Teachers from './pages/teachers';
import '@mantine/core/styles.css';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/students" element={<Students />} />
        <Route path="/teachers" element={<Teachers />} />
      </Route>
    </Routes>
  );
};

export default App;
