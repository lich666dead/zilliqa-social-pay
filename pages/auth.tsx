import React from 'react';
import { NextPage } from 'next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { useMediaQuery } from 'react-responsive';
import * as Effector from 'effector-react';

import UserStore from 'store/user';
import BrowserStore from 'store/browser';
import NotificationStore from 'store/notification';

import { Container } from 'components/container';
import { Img } from 'components/img';

const ZilliqaConnect = dynamic(() => import('components/zilliqa-connect'));
const TwitterConnect = dynamic(() => import('components/twitter-conecter'));

import { PageProp } from 'interfaces';

const AuthContainer = styled(Container)`
  display: flex;
  align-items: center;

  background: linear-gradient(180.35deg, #7882F3 -3.17%, #7882F3 42.83%, #7882F3 80.35%, #5352EE 98.93%);
  background-repeat: space;

  height: 100vh;
  width: 100vw;

  @media (max-width: 600px) {
    justify-content: center;
    padding-bottom: 20%;
    background: linear-gradient(180.35deg, #7882F3 -3.17%, #7882F3 42.83%, #7882F3 80.35%, #5352EE 98.93%);
    background-repeat: round;
    background-repeat-y: no-repeat;
  }
`;
const Background = styled(Img)`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100vw;
  height: auto;
`;

export const AuthPage: NextPage<PageProp> = () => {
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 546px)' });
  const router = useRouter();

  const userState = Effector.useStore(UserStore.store);
  const browserState = Effector.useStore(BrowserStore.store);

  const handleConnected = React.useCallback(() => {
    if (userState.jwtToken && userState.zilAddress) {
      router.push('/');
    }
  }, [userState, router]);

  const backgroundImg = React.useMemo(() => {
    if (isTabletOrMobile) {
      return `imgs/illustration-3-mobile.${browserState.format}`;
    }

    return `imgs/illustration-3.${browserState.format}`;
  }, [isTabletOrMobile, browserState]);

  React.useEffect(() => {
    if (userState.jwtToken && userState.zilAddress && router.pathname.includes('auth')) {
      if (userState.message && userState.message === 'Unauthorized') {
        UserStore.clear();
      } else {
        router.push('/');
      }
    }

    NotificationStore.clearNotification();
  }, [userState, router]);

  return (
    <React.Fragment>
      <AuthContainer>
        <TwitterConnect
          show={Boolean(!userState.jwtToken || !userState.username)}
          connected={handleConnected}
        />
        <ZilliqaConnect
          show={Boolean(userState.username && !userState.zilAddress && userState.jwtToken)}
          connected={handleConnected}
        />
      </AuthContainer>
      <Background src={backgroundImg} />
    </React.Fragment>
  );
};

export default AuthPage;
