import LogoTop from '../../assets/images/talim tizimi white.svg';
import whiteLogoBig from '../../assets/images/whiteLogoBig.png';
import Logo from '../../assets/images/logo.svg';
import IlmPlyusText from '../../assets/images/IlmPlyusText.svg';
import ptl1 from '../../assets/images/ptl1.png';
import ptl2 from '../../assets/images/ptl2.png';
import ptr1 from '../../assets/images/ptr1.png';
import ptr2 from '../../assets/images/ptr2.png';
import ptc1 from '../../assets/images/ptc1.png';
import ptc2 from '../../assets/images/ptc2.png';
import phoneLogo from '../../assets/images/phone-logo.png';
import { Link, useSearchParams } from 'react-router-dom';
import LanguageSelect from '../../components/LanguageSelect/LanguageSelect';
import { useState } from 'react';
import '../login/loginPage.css';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { API } from '../../api/api';
import useAuthStore from '../../store/useAuthStore';
import type { User } from '../../types/users.types';

interface SetPasswordPayload {
  username: string;
  temporary_password: string;
  new_password: string;
  new_password_confirmation: string;
}

interface SetPasswordResponse {
  message: string;
  token: string;
  user: User;
}

const SetPasswordPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTemp, setShowTemp] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const username = searchParams.get('username') || '';
  const { setAuth } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async (payload: SetPasswordPayload) => {
      const { data } = await API.post<SetPasswordResponse>('/set-password', payload);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user as unknown as User);
      window.location.href = '/';
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('setPassword.errorGeneric'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError(t('setPassword.errorPasswordMatch'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('setPassword.errorMinLength'));
      return;
    }
    mutation.mutate({
      username,
      temporary_password: temporaryPassword,
      new_password: newPassword,
      new_password_confirmation: confirmPassword,
    });
  };

  return (
    <section className="login">
      <div className="login-left">
        <img src={LogoTop} className="main-logo" alt="*" />
        <img src={whiteLogoBig} className="white-logo-big" alt="*" />

        <div className="login-left-center">
          <img src={Logo} className="logo" alt="*" />
          <img src={IlmPlyusText} alt="*" />
          <h1>{t('login.system')}</h1>
        </div>

        <div className="login-left-bottom">
          <h1>{t('login.systemSupport')}</h1>
          <div
            className="login-support"
            style={{ display: 'flex', gap: 200, alignItems: 'center' }}
          >
            <a target="_blank" href="tel:+998742002020">
              <i className="fa-solid fa-phone" />
              74 200 20 20
            </a>
            <Link target="_blank" to="https://web.telegram.org/">
              <i className="fa-brands fa-telegram"></i> {t('login.telegramGroup')}
            </Link>
            <Link target="_blank" to="https://www.youtube.com/">
              <i className="fa-brands fa-youtube"></i> {t('login.instruction')}
            </Link>
          </div>
        </div>
      </div>

      <div className="login-right">
        <LanguageSelect variant="login" />
        <img src={phoneLogo} alt="*" className="phone-logo" />

        <div className="login-right-content">
          <h1>{t('setPassword.title')}</h1>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={username}
              readOnly
              placeholder={t('setPassword.usernamePlaceholder')}
              style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
            />

            <div className="password-wrapper">
              <input
                type={showTemp ? 'text' : 'password'}
                value={temporaryPassword}
                onChange={(e) => {
                  setTemporaryPassword(e.target.value);
                  setError('');
                }}
                placeholder={t('setPassword.tempPasswordPlaceholder')}
                required
              />
              <button type="button" className="password-eye" onClick={() => setShowTemp((v) => !v)}>
                <i className={`fa-solid ${showTemp ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>

            <div className="password-wrapper">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                placeholder={t('setPassword.newPasswordPlaceholder')}
                required
              />
              <button type="button" className="password-eye" onClick={() => setShowNew((v) => !v)}>
                <i className={`fa-solid ${showNew ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>

            <div className="password-wrapper">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder={t('setPassword.confirmPasswordPlaceholder')}
                required
              />
              <button
                type="button"
                className="password-eye"
                onClick={() => setShowConfirm((v) => !v)}
              >
                <i className={`fa-solid ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>

            {error && (
              <p style={{ color: '#e03131', fontSize: 14, margin: '4px 0 0', textAlign: 'center' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              style={{ width: '60%' }}
              className="login-btn"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? t('setPassword.saving') : t('setPassword.submitBtn')}
            </button>
          </form>
        </div>

        <div
          className="login-support login-support-phone"
          style={{ display: 'flex', gap: 20, alignItems: 'center' }}
        >
          <a target="_blank" href="tel:+998742002020">
            <i className="fa-solid fa-phone" />
          </a>
          <Link target="_blank" to="https://web.telegram.org/">
            <i className="fa-brands fa-telegram"></i>
          </Link>
          <Link target="_blank" to="https://www.youtube.com/">
            <i className="fa-brands fa-youtube"></i>
          </Link>
        </div>
        <h4>
          © 2026 ILM PLYUS {t('login.system')}. <br /> <span>{t('login.rightReserved')}</span>
        </h4>
        <img src={ptl1} className="ptl1" />
        <img src={ptl2} className="ptl2" />
        <img src={ptc1} className="ptc1" />
        <img src={ptc2} className="ptc2" />
        <img src={ptr1} className="ptr1" />
        <img src={ptr2} className="ptr2" />
      </div>
    </section>
  );
};

export default SetPasswordPage;
