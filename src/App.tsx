import { Route, Routes, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import LoginPage from './pages/login';
import Layout from './components/Layout';
import Users from './pages/users';
import Settings from './pages/settings';
import Branches from './pages/branches';
import Classes from './pages/classes';
import Students from './pages/students';
import Teachers from './pages/teachers';
import Roles from './pages/roles';
import RolePermissions from './pages/roles/RolePermissions';
import CreateRole from './pages/roles/CreateRole';
import Payments from './pages/payments';
import ArchivedPayments from './pages/archive';
import Expenses from './pages/expenses';
import ExpenseCategory from './pages/expenses/expenseCategory';
import ExpenseSubCategory from './pages/expenses/expenseSubCategory';
import Courses from './pages/courses';
import NotFound from './pages/notFound';
import Rooms from './pages/rooms';
import Department from './pages/department';
import Areas from './pages/regions';
import AreaRegions from './pages/regions/areaRegions';
import AreaDistricts from './pages/regions/areaDistricts';
import Levels from './pages/levels';
import Positions from './pages/positions';
import AttendancePage from './pages/attendance';
import Operators from './pages/operators';
import Sources from './pages/sources';
import RefusalReasons from './pages/refusal-reasons';

// New pages
import FaceId from './pages/face-id';
import Contracts from './pages/contracts';
import ContractsCreate from './pages/contracts/ContractsCreate';
import CoursePrices from './pages/course-prices';
import LessonSchedule from './pages/lesson-schedule';
import DemoLesson from './pages/demo-lesson';
import Groups from './pages/groups';
import Lid from './pages/lid';
import IpTelephone from './pages/ip-telephone';
import Tasks from './pages/tasks';
import Questions from './pages/questions';
import StudentsAttendance from './pages/students-attendance';
import StudentTasks from './pages/student-tasks';
import StudentsContract from './pages/students-contract';
import UnderAge from './pages/students-contract/underAge';
import LegalEntity from './pages/students-contract/legalEntity';
import RepresentativeEntity from './pages/students-contract/representativeEntity';
import ContractDetails from './pages/students-contract/ContractDetails';
import Salaries from './pages/salaries';
import Employees from './pages/employees';

// Archive pages
import UsersArchive from './pages/users/archive';
import BranchesArchive from './pages/branches/archive';
import StudentsArchive from './pages/students/archive';
import TeachersArchive from './pages/teachers/archive';
import CoursesArchive from './pages/courses/archive';
import LevelsArchive from './pages/levels/archive';
import PositionsArchive from './pages/positions/archive';
import RoomsArchive from './pages/rooms/archive';
import DepartmentArchive from './pages/department/archive';
import SourcesArchive from './pages/sources/archive';
import RefusalReasonsArchive from './pages/refusal-reasons/archive';
import RolesArchive from './pages/roles/archive';
import OperatorsArchive from './pages/operators/archive';
import ContractsArchive from './pages/contracts/archive';
import CoursePricesArchive from './pages/course-prices/archive';
import GroupsArchive from './pages/groups/archive';
import DemoLessonArchive from './pages/demo-lesson/archive';
import LessonScheduleArchive from './pages/lesson-schedule/archive';
import LidArchive from './pages/lid/archive';
import IpTelephoneArchive from './pages/ip-telephone/archive';
import TasksArchive from './pages/tasks/archive';
import QuestionsArchive from './pages/questions/archive';
import SalariesArchive from './pages/salaries/archive';
import StudentTasksArchive from './pages/student-tasks/archive';
import StudentsContractArchive from './pages/students-contract/archive';
import ExpensesArchive from './pages/expenses/archive';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

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
      <Route path="/login" element={isAuth ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />

          {/* Foydalanuvchilar */}
          <Route path="/users" element={<Users />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/roles/create" element={<CreateRole />} />
          <Route path="/roles/:id/permissions" element={<RolePermissions />} />
          <Route path="/operators" element={<Operators />} />

          {/* Tashkilot */}
          <Route path="/branches" element={<Branches />} />
          <Route path="/areas" element={<Areas />} />
          <Route path="/areas/regions" element={<AreaRegions />} />
          <Route path="/areas/districts" element={<AreaDistricts />} />
          <Route path="/department" element={<Department />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/face-id" element={<FaceId />} />

          {/* Xodimlar bo'limi */}
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/positions" element={<Positions />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/contracts/create" element={<ContractsCreate />} />
          <Route path="/teachers" element={<Teachers />} />

          {/* Kurslar */}
          <Route path="/courses" element={<Courses />} />
          <Route path="/levels" element={<Levels />} />
          <Route path="/course-prices" element={<CoursePrices />} />
          <Route path="/lesson-schedule" element={<LessonSchedule />} />
          <Route path="/demo-lesson" element={<DemoLesson />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/classes" element={<Classes />} />

          {/* Sotuv bo'limi */}
          <Route path="/lid" element={<Lid />} />
          <Route path="/ip-telephone" element={<IpTelephone />} />
          <Route path="/refusal-reasons" element={<RefusalReasons />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/tasks" element={<Tasks />} />

          {/* Test */}
          <Route path="/questions" element={<Questions />} />

          {/* Chiqimlar */}
          <Route path="/expenses/create" element={<Expenses />} />
          <Route path="/expenses/category" element={<ExpenseCategory />} />
          <Route path="/expenses/subcategory" element={<ExpenseSubCategory />} />

          {/* O'quvchilar */}
          <Route path="/students-attendance" element={<StudentsAttendance />} />
          <Route path="/student-tasks" element={<StudentTasks />} />
          <Route path="/students-contract" element={<StudentsContract />} />
          <Route path="/students-contract/adult" element={<StudentsContract />} />
          <Route path="/students-contract/adult/edit/:id" element={<StudentsContract />} />
          <Route path="/students-contract/minor" element={<UnderAge />} />
          <Route path="/students-contract/minor/edit/:id" element={<UnderAge />} />
          <Route path="/students-contract/legal" element={<LegalEntity />} />
          <Route path="/students-contract/legal/edit/:id" element={<LegalEntity />} />
          <Route
            path="/students-contract/legal-representative"
            element={<RepresentativeEntity />}
          />
          <Route
            path="/students-contract/legal-representative/edit/:id"
            element={<RepresentativeEntity />}
          />
          <Route path="/students-contract/:id" element={<ContractDetails />} />
          <Route path="/students" element={<Students />} />

          {/* To'lovlar */}
          <Route path="/payments" element={<Payments />} />
          <Route path="/payments/archive" element={<ArchivedPayments />} />

          {/* Oyliklar */}
          <Route path="/salaries" element={<Salaries />} />

          {/* Xodimlar */}
          <Route path="/employees" element={<Employees />} />

          {/* Arxivlar */}
          <Route path="/users/archive" element={<UsersArchive />} />
          <Route path="/branches/archive" element={<BranchesArchive />} />
          <Route path="/students/archive" element={<StudentsArchive />} />
          <Route path="/teachers/archive" element={<TeachersArchive />} />
          <Route path="/courses/archive" element={<CoursesArchive />} />
          <Route path="/levels/archive" element={<LevelsArchive />} />
          <Route path="/positions/archive" element={<PositionsArchive />} />
          <Route path="/rooms/archive" element={<RoomsArchive />} />
          <Route path="/department/archive" element={<DepartmentArchive />} />
          <Route path="/sources/archive" element={<SourcesArchive />} />
          <Route path="/refusal-reasons/archive" element={<RefusalReasonsArchive />} />
          <Route path="/roles/archive" element={<RolesArchive />} />
          <Route path="/operators/archive" element={<OperatorsArchive />} />
          <Route path="/contracts/archive" element={<ContractsArchive />} />
          <Route path="/course-prices/archive" element={<CoursePricesArchive />} />
          <Route path="/groups/archive" element={<GroupsArchive />} />
          <Route path="/demo-lesson/archive" element={<DemoLessonArchive />} />
          <Route path="/lesson-schedule/archive" element={<LessonScheduleArchive />} />
          <Route path="/lid/archive" element={<LidArchive />} />
          <Route path="/ip-telephone/archive" element={<IpTelephoneArchive />} />
          <Route path="/tasks/archive" element={<TasksArchive />} />
          <Route path="/questions/archive" element={<QuestionsArchive />} />
          <Route path="/salaries/archive" element={<SalariesArchive />} />
          <Route path="/student-tasks/archive" element={<StudentTasksArchive />} />
          <Route path="/students-contract/archive" element={<StudentsContractArchive />} />
          <Route path="/expenses/archive" element={<ExpensesArchive />} />

          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
