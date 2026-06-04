import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import userIcon from '../assets/images/user-icon.svg';
import LanguageSelect from './LanguageSelect/LanguageSelect';
import useAuthStore from '../store/useAuthStore';

const Header = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fullName = user?.full_name || user?.username || '';
  const roleName = user?.roles?.[0]?.name || '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <LanguageSelect />
      <div className="header-user-wrapper" ref={ref}>
        <div className="header-user-trigger" onClick={() => setOpen((v) => !v)}>
          <div>
            <h1 className="user-name">{fullName}</h1>
            <p className="user-role">{roleName}</p>
          </div>

          <div className="user-icon-circle">
            <img src={userIcon} alt="" />
          </div>
        </div>

        {open && (
          <div className="header-dropdown">
            <button className="header-dropdown-item" onClick={handleLogout}>
              <i className="fa-solid fa-arrow-right-from-bracket header-dropdown-icon" />
              Chiqish
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
