import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './regions.css';

const Areas = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const menuItems = [
    {
      title: t('aside.regions'),
      path: '/areas/regions',
      icon: 'fa-solid fa-map-location-dot',
    },
    {
      title: t('aside.districts'),
      path: '/areas/districts',
      icon: 'fa-solid fa-city',
    },
  ];

  return (
    <section className="users container">
      <h1 className="main-title">{t('aside.areas')}</h1>

      <div className="areas-selection-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '30px',
        marginTop: '50px'
      }}>
        {menuItems.map((item) => (
          <div
            key={item.path}
            className="area-card"
            onClick={() => navigate(item.path)}
            style={{
              backgroundColor: '#fff',
              padding: '40px',
              borderRadius: '15px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
          >
            <div className="area-icon-box" style={{
              fontSize: '48px',
              color: '#003366',
              marginBottom: '20px'
            }}>
              <i className={item.icon}></i>
            </div>
            <h2 style={{
              fontFamily: 'noto-b',
              fontSize: '20px',
              color: '#003366'
            }}>
              {item.title}
            </h2>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Areas;
