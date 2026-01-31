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
import { Modal, Button, Text, TextInput, Group, Stack, Paper } from '@mantine/core';
import { useState } from 'react';
import './loginPage.css';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 50em)');
  const [code, setCode] = useState('');

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

              <Text fw={500}>3:00</Text>
            </Group>

            <Group grow mt="md">
              <Button variant="outline" radius="xl" onClick={close}>
                {t('login.logout')}
              </Button>

              <Button radius="xl">{t('login.login')}</Button>
            </Group>
          </Stack>
        </Paper>
      </Modal>
      <div className="login-left">
        <img src={LogoTop} className="main-logo" alt="*" />
        <img src={whiteLogoBig} className="white-logo-big" alt="*" />

        <div className="login-left-center">
          <img src={Logo} className="logo" alt="*" />
          <img src={IlmPlyusText} alt="" />
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
        <LanguageSelect />
        <img src={phoneLogo} alt="*" className="phone-logo" />
        <div className="login-right-content">
          <h1>{t('login.authorization')}</h1>
          <form>
            <input type="text" placeholder={t('login.loginPlaceHolder')} />
            <input type="password" placeholder={t('login.passwordPlaceHolder')} />
          </form>
          <Link to="">{t('login.resetPassword')}</Link>
          <button type="button" onClick={open} className="login-btn">
            {t('login.login')}
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
