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
import { Link } from 'react-router-dom';
import LanguageSelect from '../../components/LanguageSelect/LanguageSelect';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { Modal, Button, Text, TextInput, Group, Stack, Paper, PasswordInput } from '@mantine/core';
import { useState, useEffect } from 'react';
import './loginPage.css';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { API } from '../../api/api';
import useAuthStore from '../../store/useAuthStore';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    role: string;
  };
}

const LoginPage = () => {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(180);
  const [opened, { open, close }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 50em)');
  const [code, setCode] = useState('');
  const [resetOpened, resetHandlers] = useDisclosure(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleOpen = () => {
    setSeconds(180);
    open();
  };

  const handleResetOpen = () => {
    resetHandlers.open();
  };

  useEffect(() => {
    if (!opened) return;

    const interval = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [opened]);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const isValid = newPassword.length >= 8 && newPassword === confirmPassword;

  const { setToken, setUser } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await API.post<LoginResponse>('/login', payload);
      return data;
    },

    onSuccess: (data) => {
      setToken(data.token);
      setUser(data.user);
      window.location.href = '/';
    },

    onError: (error) => {
      console.error(error);
    },
  });

  return (
    <section className="login">
      <Modal
        opened={opened}
        onClose={close}
        centered
        withinPortal
        fullScreen={isMobile}
        zIndex={99999}
        withCloseButton={false}
        overlayProps={{
          blur: 6,
          backgroundOpacity: 0.6,
        }}
      >
        <Paper radius="lg" p="xl" maw={520} mx="auto" my="auto" shadow="lg" bg="white">
          <Stack gap="md">
            <Text fw={700} size="xl" ta="center" c="blue.9">
              {t('login.auth')}
            </Text>

            <Text size="sm" ta="center" c="dimmed">
              {t('login.authText')}
            </Text>

            <Group grow align="flex-end">
              <TextInput
                value={code}
                onChange={(e) => setCode(e.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="XXXXXX"
                size="md"
                radius="md"
                styles={{
                  input: {
                    textAlign: 'center',
                    letterSpacing: 4,
                    fontSize: 18,
                  },
                }}
              />

              <Text fw={500}>
                {minutes}:{remainingSeconds.toString().padStart(2, '0')}
              </Text>
            </Group>

            <Group grow mt="md">
              <Button variant="fill" bg="red" radius="xl" onClick={close}>
                {t('login.logout')}
              </Button>

              <Button radius="xl">{t('login.login')}</Button>
            </Group>
          </Stack>
        </Paper>
      </Modal>

      <Modal
        opened={resetOpened}
        onClose={resetHandlers.close}
        centered
        withinPortal
        fullScreen={isMobile}
        zIndex={99999}
        withCloseButton={false}
        overlayProps={{
          blur: 6,
          backgroundOpacity: 0.6,
        }}
      >
        <Paper radius="lg" p="xl" maw={520} mx="auto" shadow="lg">
          <Stack gap="md" align="center">
            <Text fw={700} size="xl" c="blue.9">
              Parol yangilash
            </Text>

            <Text size="sm" c="dimmed" ta="center">
              8ta harfdan yoki raqamdan iborat kod qoyin.
            </Text>

            <PasswordInput
              value={newPassword}
              className="custom-password"
              onChange={(e) => setNewPassword(e.currentTarget.value)}
              placeholder="XXXXXXXX"
              radius="xl"
              size="lg"
            />

            <PasswordInput
              value={confirmPassword}
              className="custom-password"
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              placeholder="XXXXXXXX"
              radius="xl"
              size="lg"
              mt="sm"
            />

            <Button disabled={!isValid} radius="xl" fullWidth mt="sm">
              Kirish
            </Button>
          </Stack>
        </Paper>
      </Modal>

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
          <h1>{t('login.authorization')}</h1>
          <form>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder={t('login.loginPlaceHolder')}
            />
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceHolder')}
              />

              <button
                type="button"
                className="password-eye"
                onClick={() => setShowPassword((v) => !v)}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </form>
          <Link
            to=""
            onClick={(e) => {
              e.preventDefault();
              handleResetOpen();
            }}
          >
            {t('login.resetPassword')}
          </Link>
          <button
            type="button"
            className="login-btn"
            disabled={loginMutation.isPending}
            onClick={() =>
              loginMutation.mutate({
                username: login,
                password,
              })
            }
          >
            {loginMutation.isPending ? 'Loading...' : t('login.login')}
          </button>
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

export default LoginPage;
