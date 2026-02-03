import ControlCard from '../components/ControlCard';
import WeeklySalesChart from '../components/WeeklySalesChart';

const Home = () => {
  return (
    <section className="control container">
      <div className="control-top">
        <ControlCard />
      </div>

      <div className="control-content">
        <div className="control-content-left">
          <h1>Haftalik savdo</h1>

          <div className="chart">
            <WeeklySalesChart />
          </div>
        </div>

        <div className="control-content-right">
          <h1>Savdo turlari bo‘yicha</h1>

          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              marginTop: 35,
              gap: 10,
            }}
          >
            <h4>
              Savdo soni <span>12ta</span>
            </h4>
            <h5>
              Naqd <span>3.500.000</span>
            </h5>
            <h5>
              Karta <span>750.000</span>
            </h5>
            <h5>
              Bank <span>2.000.000</span>
            </h5>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'center',
              marginTop: 45,
            }}
          >
            <h2>Umumiy summa</h2>

            <div
              style={{
                width: '100%',
                paddingTop: 12,
                borderTop: '1px solid #003366',
                textAlign: 'center',
              }}
            >
              <h3>6.250.000so‘m</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;
