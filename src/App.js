import './App.css';
//BrowserRouter - dev.
//HashRouter - prod.
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header/Header';
import Accounts from './pages/Accounts.page';
import Confirmations from './pages/Confirmations.page';
import ImportPage from './pages/Import.page';
import ToogleGuard from './pages/ToogleGuard.page';
import InputPage from './pages/Input.page';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import SettingsPage from './pages/Settings.page';
import LoginPage from './pages/Login.page';
import NotificationPage from './pages/Notification.page';


function App() {
  const currentPath = window.location.pathname;
  const renderHeader = () => {
    if (currentPath === '/notifications' || window.location.hash.includes('notifications')) {
      return <></>;
    } else {
      return (
        <>
          <Header />
          <hr style={{ margin: "0 5px 15px 5px" }} />
        </>
      );
    }
  };

  return (
    <div className={`App${currentPath === '/notifications' || window.location.hash.includes('notifications') ? ' noBG nDragble nSelected' : ''}`}>
      {renderHeader()}
      <Router>
        <Routes>
          <Route path='/settings' element={<SettingsPage />} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='/notifications' element={<NotificationPage />}/>
          <Route path='/needInput' element={<InputPage />} />
          <Route path="/steamguard" element={<ToogleGuard />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/confirmations" element={<Confirmations />} />
          <Route path="*" element={<Accounts />} />
        </Routes>
      </Router>
      <ToastContainer style={{maxWidth: '70%'}} toastStyle={{margin: '5px', borderRadius: '5px'}} className={"nDragble"} position="bottom-center"
autoClose={3500}
limit={3}
hideProgressBar={false}
newestOnTop={false}
closeOnClick
rtl={false}
pauseOnFocusLoss={false}
draggable
theme="dark"/>
    </div>
  );
}

export default App;
