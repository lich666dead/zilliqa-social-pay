import React from 'react';
import * as Effector from 'effector-react';
import moment from 'moment';
import { validation } from '@zilliqa-js/util';
import { TwitterTweetEmbed } from 'react-twitter-embed';
import ClipLoader from 'react-spinners/ClipLoader';
import { useMediaQuery } from 'react-responsive';
import { useRouter } from 'next/router';

import EventStore from 'store/event';
import UserStore from 'store/user';
import TwitterStore from 'store/twitter';
import BrowserStore from 'store/browser';
import BlockchainStore from 'store/blockchain';

import { Modal } from 'components/modal';
import { Img } from 'components/img';
import { FieldInput } from 'components/Input';
import { Text } from 'components/text';
import { Button } from 'components/button';
import { ContainerLoader } from 'components/container-loader';
import { Container } from 'components/container';
import { NotificationsControl } from 'components/notification-control';
import { TextWarning } from 'components/warning-text';
import Recaptcha from 'react-recaptcha';

import {
  ButtonVariants,
  Events,
  SizeComponent,
  FontColors,
  FontSize,
  Fonts,
  Sides
} from 'config';
import ERROR_CODES from 'config/error-codes';
import { addTweet } from 'utils/update-tweets';
import { Twitte } from 'interfaces';
import { claimTweet } from 'utils/claim-tweet';
import { timerCalc } from 'utils/timer';

const SPINER_SIZE = 150;
const WIDTH_MOBILE = 250;
const WIDTH_DEFAULT = 450;
const SLEEP = 100;

/**
 * Container for modals and any componets with fixed postion.
 */
export const FixedWrapper: React.FC = () => {
  const router = useRouter();
  const isTabletOrMobile = useMediaQuery({ query: '(max-width: 546px)' });

  // Effector hooks //
  const browserState = Effector.useStore(BrowserStore.store);
  const eventState = Effector.useStore(EventStore.store);
  const userState = Effector.useStore(UserStore.store);
  const blockchainState = Effector.useStore(BlockchainStore.store);
  const twitterState = Effector.useStore(TwitterStore.store);
  // Effector hooks //

  // React hooks //*
  // State for address error handle.
  const [addressErr, setAddressErr] = React.useState<string | null>(null);
  // State for Zilliqa address in bech32 (zil1) format.
  const [address, setAddress] = React.useState<string>(userState.zilAddress);
  // State for check is tablet or mobile width.
  const [twitterWidth] = React.useState(isTabletOrMobile ? WIDTH_MOBILE : WIDTH_DEFAULT);
  const [placeholder, setPlaceholder] = React.useState<string>();
  const [recaptchaKey, setRecaptchaKey] = React.useState<string>('');
  const [recaptchaClaim, setRecaptchaClaim] = React.useState<string>('');
  const [disabledAddress, setDisabledAddress] = React.useState<boolean>();

  const handleClickOk = React.useCallback(() => {
    EventStore.reset();
    setRecaptchaClaim('');
  }, [setRecaptchaClaim, recaptchaClaim]);
  const handleClickClaim = React.useCallback(async (key: string) => {
    EventStore.setEvent(Events.Load);

    await UserStore.updateUserState(null);
    await BlockchainStore.updateBlockchain(null);

    if (userState.synchronization) {
      EventStore.setContent({
        message: 'Waiting for address to sync...'
      });
      EventStore.setEvent(Events.Error);

      return null;
    } else if (Boolean(blockchainState.dayTimer)) {
      EventStore.setContent({
        message: `You can participate: ${blockchainState.dayTimer}`
      });
      EventStore.setEvent(Events.Error);

      return null;
    } else if (!userState.zilAddress) {
      EventStore.setContent({
        message: 'Please configure your Zilliqa address.'
      });
      EventStore.setEvent(Events.Error);

      return null;
    }

    const result = await claimTweet(userState.jwtToken, eventState.content, key);

    if (result.code === ERROR_CODES.lowFavoriteCount || result.code === ERROR_CODES.campaignDown) {
      EventStore.setContent(result);
      EventStore.setEvent(Events.Error);

      return null;
    } else if (result.code === ERROR_CODES.unauthorized) {
      router.push('/auth');

      return null;
    }

    if (result.message) {
      TwitterStore.setLastBlock(result.lastTweet);
      BlockchainStore.updateStore({
        ...blockchainState,
        BlockNum: result.currentBlock
      });

      const time = timerCalc(
        blockchainState,
        result.lastTweet,
        Number(blockchainState.blocksPerDay)
      );
      EventStore.setContent({
        message: `You can participate: ${moment(time).fromNow()}`
      });
      EventStore.setEvent(Events.Error);
    } else {
      const mapetTweets = twitterState.tweets.map((t) => {
        if (t.id === result.id) {
          return result;
        }

        return t;
      });

      if (Number(result.block) > Number(twitterState.lastBlockNumber)) {
        TwitterStore.setLastBlock(result.block);
        BlockchainStore.updateTimer();
      }

      TwitterStore.setShowTwitterTweetEmbed(false);
      setTimeout(() => TwitterStore.setShowTwitterTweetEmbed(true), SLEEP);

      TwitterStore.update(mapetTweets);

      setRecaptchaClaim(key);
      EventStore.setEvent(Events.Claimed);
    }
  }, [setRecaptchaClaim, recaptchaClaim, eventState, userState]);
  /**
   * Handle submit (Zilliqa address) form.
   * @param event HTMLForm event.
   */
  const handleAddressChange = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!address) {
      setAddressErr('Please enter a valid address.');

      return null;
    } else if (!validation.isBech32(address)) {
      setAddressErr('Incorrect address format.');

      return null;
    } else if (address === userState.zilAddress) {
      setAddressErr(`You're already connected to this address.`);

      return null;
    }

    setAddress(address);

    EventStore.setEvent(Events.Load);

    // Send to server for validation and update address.
    const result = await UserStore.updateAddress({
      address,
      jwt: userState.jwtToken,
      recaptchaKey
    });

    setRecaptchaKey('');

    if (result.code === ERROR_CODES.unauthorized) {
      EventStore.reset();
      UserStore.clear();
      router.push('/auth');

      return null;
    }

    if (result.message && result.message !== 'ConfiguredUserAddress') {
      EventStore.setContent(result);
      EventStore.setEvent(Events.Error);

      return null;
    }

    EventStore.reset();
  }, [address, validation, setAddressErr, addressErr, userState, router, recaptchaKey]);
  /**
   * Handle input address for Input component.
   * @param event HTMLInput event.
   */
  const handleChangeAddress = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setAddressErr(null);

    if (!value) {
      return null;
    }

    setAddress(value);
  }, [setAddressErr, setAddress]);
  /**
   * Handle send tweet to server for validation and verification.
   */
  const handlePay = React.useCallback(async () => {
    EventStore.setEvent(Events.Load);
    const result = await TwitterStore.payTweet({
      jwt: userState.jwtToken,
      tweete: (eventState.content as Twitte)
    });

    if (result.code === ERROR_CODES.lowFavoriteCount) {
      EventStore.reset();
      EventStore.setContent(result);
      EventStore.setEvent(Events.Error);

      return null;
    } else if (result.code === ERROR_CODES.unauthorized) {
      EventStore.reset();
      UserStore.clear();
      router.push('/auth');

      return null;
    }
    TwitterStore.setShowTwitterTweetEmbed(false);

    setTimeout(() => TwitterStore.setShowTwitterTweetEmbed(true), SLEEP);

    if (result.message.includes('Added')) {
      TwitterStore.add(result.tweet);
      EventStore.setEvent(Events.Claimed);
    } else {
      EventStore.reset();
    }
  }, [addTweet, EventStore, userState, eventState, TwitterStore]);

  React.useEffect(() => {
    if (Boolean(blockchainState.weekTimer)) {
      setPlaceholder(`You can change your address: ${blockchainState.weekTimer}`);
      setDisabledAddress(true);
      setAddress('');
    } else if (userState.synchronization) {
      setPlaceholder('Waiting for address to sync...');
      setDisabledAddress(true);
      setAddress('');
    } else if (!Boolean(blockchainState.weekTimer) && !userState.synchronization && !address) {
      setAddress(userState.zilAddress);
      setDisabledAddress(false);
    }
  }, [
    address,
    setAddress,
    userState,
    setPlaceholder,
    disabledAddress,
    blockchainState
  ]);
  // React hooks //

  return (
    <React.Fragment>
      <Modal
        show={eventState.current === Events.Settings}
        onBlur={() => EventStore.reset()}
      >
        <form onSubmit={handleAddressChange}>
          <TextWarning fontVariant={Fonts.AvenirNextLTProDemi}>
            DO NOT LINK EXCHANGE ADDRESSES!!!
          </TextWarning>
          <FieldInput
            defaultValue={address}
            sizeVariant={SizeComponent.lg}
            error={addressErr}
            placeholder={placeholder}
            disabled={disabledAddress}
            css="font-size: 15px;width: 300px;"
            onChange={handleChangeAddress}
          />
          {Boolean(recaptchaKey) ? <Button
              sizeVariant={SizeComponent.lg}
              variant={ButtonVariants.primary}
              disabled={Boolean(disabledAddress)}
              css="margin-top: 10px;"
            >
              Change address
            </Button> : <Recaptcha
              sitekey={browserState.recaptchaKey}
              verifyCallback={setRecaptchaKey}
            />
          }
        </form>
      </Modal>
      <Modal
        show={eventState.current === Events.Claimed}
        onBlur={handleClickOk}
      >
        <Container css="display: grid;justify-items: center;grid-gap: 15px;min-width: 300px;">
          {Boolean(recaptchaClaim) ? (
            <React.Fragment>
              <Text
                size={FontSize.sm}
                fontVariant={Fonts.AvenirNextLTProDemi}
                fontColors={FontColors.white}
                align={Sides.center}
                css="max-width: 300px;"
              >
                Claim successful! Your $ZIL reward will be distributed in a while…
              </Text>
              <Img src="icons/ok.svg" />
              <Button
                sizeVariant={SizeComponent.lg}
                variant={ButtonVariants.primary}
                onClick={handleClickOk}
              >
                OK
              </Button>
            </React.Fragment>
          ) : (
            <Recaptcha
              sitekey={browserState.recaptchaKey}
              verifyCallback={handleClickClaim}
            />
          )}
        </Container>
      </Modal>
      <Modal
        show={eventState.current === Events.Twitter}
        onBlur={() => EventStore.reset()}
      >
        {Boolean(eventState.content && eventState.content.id_str) ? (
          <Container css={`display: grid;width: ${twitterWidth}px`}>
            <TwitterTweetEmbed
              screenName={userState.screenName}
              tweetId={eventState.content.id_str}
              options={{
                width: twitterWidth
              }}
            />
            {!Boolean(blockchainState.dayTimer) ? (
              <Button
                sizeVariant={SizeComponent.lg}
                variant={ButtonVariants.primary}
                css="justify-self: center;margin-top: 30px;"
                onClick={handlePay}
              >
                Claim
              </Button>
            ) : (
                <Text
                  size={FontSize.sm}
                  fontVariant={Fonts.AvenirNextLTProDemi}
                  fontColors={FontColors.white}
                >
                  You can participate: {blockchainState.dayTimer}
                </Text>
              )}
          </Container>
        ) : null}
      </Modal>
      <Modal
        show={eventState.current === Events.Error}
        onBlur={() => EventStore.reset()}
      >
        <Container css="display: grid;justify-items: center;">
          <Img
            src={`/imgs/error.${browserState.format}`}
            css="width: 200px;height: auto;"
          />
          <Text
            size={FontSize.lg}
            fontVariant={Fonts.AvenirNextLTProDemi}
            fontColors={FontColors.white}
          >
            I'm sorry...
          </Text>
          {Boolean(eventState.content && eventState.content.message) ? <Text
            size={FontSize.sm}
            fontColors={FontColors.white}
            fontVariant={Fonts.AvenirNextLTProBold}
            align={Sides.center}
            css="min-width: 300px;"
          >
            {eventState.content.message}
          </Text> : null}
        </Container>
      </Modal>
      <ContainerLoader show={eventState.current === Events.Load}>
        <ClipLoader
          size={SPINER_SIZE}
          color={FontColors.info}
          loading={eventState.current === Events.Load}
        />
      </ContainerLoader>
      <NotificationsControl />
    </React.Fragment>
  );
};

export default FixedWrapper;
