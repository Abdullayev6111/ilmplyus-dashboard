import { Route, Routes, Navigate } from "react-router-dom";
import useAuthStore from "./store/useAuthStore";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import LoginPage from "./pages/login";
import Layout from "./components/Layout";
import Users from "./pages/users";
import Settings from "./pages/settings";
import Branches from "./pages/branches";
import Classes from "./pages/classes";
import Students from "./pages/students";
import Teachers from "./pages/teachers";
import Roles from "./pages/roles";
import Payments from "./pages/payments";
import ArchivedPayments from "./pages/archive";
import Expenses from "./pages/expenses";
import ExpenseCategory from "./pages/expenses/expenseCategory";
import ExpenseSubCategory from "./pages/expenses/expenseSubCategory";
import Courses from "./pages/courses";
import NotFound from "./pages/notFound";
import Rooms from "./pages/rooms";
import Department from "./pages/department";
import Areas from "./pages/regions";
import AreaRegions from "./pages/regions/areaRegions";
import AreaDistricts from "./pages/regions/areaDistricts";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

const App = () => {
  const isAuth = useAuthStore((state) => state.isAuth);

  const { expiresAt, logout } = useAuthStore.getState();

  if (expiresAt) {
    const timeout = expiresAt - Date.now();

    if (timeout > 0) {
      setTimeout(() => logout(), timeout);
    } else {
      logout();
    }
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuth ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/areas" element={<Areas />} />
          <Route path="/areas/regions" element={<AreaRegions />} />
          <Route path="/areas/districts" element={<AreaDistricts />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/students" element={<Students />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/payments/archive" element={<ArchivedPayments />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/expenses/create" element={<Expenses />} />
          <Route path="/expenses/category" element={<ExpenseCategory />} />
          <Route
            path="/expenses/subcategory"
            element={<ExpenseSubCategory />}
          />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/department" element={<Department />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
