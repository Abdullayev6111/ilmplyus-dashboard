import { NavLink } from 'react-router-dom';

type ControlItem = {
  id: number;
  title: string;
  number: string;
  path: string;
};

const ControlCard = () => {
  const controlData: ControlItem[] = [
    { id: 1, title: 'Bugungi savdo', number: "13.200.000 so'm", path: '/' },
    { id: 2, title: 'Foydaluvchilar', number: '74 ta', path: '/users' },
    { id: 3, title: 'Xatoliklar', number: '11 ta', path: '/' },
    { id: 4, title: 'Filiallar', number: '4 ta', path: '/branches' },
    { id: 5, title: 'Omborxona maxsulotlar', number: '10 ta', path: '/' },
  ];
  return (
    <>
      {controlData.map((item) => (
        <NavLink key={item.id} to={item.path} className="control-card">
          <h4>{item.title}</h4>
          <p>{item.number}</p>
        </NavLink>
      ))}
    </>
  );
};

export default ControlCard;
