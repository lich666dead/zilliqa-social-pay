import { createDomain } from 'effector';

import { fetchTweetsUpdate, addTweet } from 'utils/update-tweets';
import { fetchTweets, removeTweete } from 'utils/get-tweets';
import { toUnique } from 'utils/to-unique';
import { Twitte, FetchTweets } from 'interfaces';

export const TwitterDomain = createDomain();
export const update = TwitterDomain.event<Twitte[]>();
export const setLastBlock = TwitterDomain.event<string | number>();
export const add = TwitterDomain.event<Twitte>();
export const clear = TwitterDomain.event();
export const setShowTwitterTweetEmbed = TwitterDomain.event<boolean>();
export const getTweets = TwitterDomain.effect<{ limit?: number, offset?: number }, any[] | any, Error>();
export const deleteTweet = TwitterDomain.effect<{ tweete: Twitte; jwt: string; }, number, Error>();
export const payTweet = TwitterDomain.effect<{ tweete: Twitte; jwt: string; }, any, Error>();

export const updateTweets = TwitterDomain.effect<string, FetchTweets, Error>();

updateTweets.use(fetchTweetsUpdate);
getTweets.use(fetchTweets);
deleteTweet.use(removeTweete);
payTweet.use(addTweet);

type InitState = {
  error?: boolean;
  lastBlockNumber: number | string;
  showTwitterTweetEmbed: boolean;
} & FetchTweets;

const initalState: InitState = {
  error: undefined,
  showTwitterTweetEmbed: true,
  tweets: [],
  count: 0,
  verifiedCount: 0,
  lastBlockNumber: 0
};

export const store = TwitterDomain.store(initalState)
  .on(update, (state, tweets) => ({
    ...state,
    tweets,
    verifiedCount: tweets.filter((el) => el.approved).length
  }))
  .on(setShowTwitterTweetEmbed, (state, showTwitterTweetEmbed) => ({ ...state, showTwitterTweetEmbed }))
  .on(updateTweets.done, (state, { result }) => {
    if (Array.isArray(result.tweets) && result.tweets.length > 0) {
      const tweets = toUnique(state.tweets.concat(result.tweets), 'idStr');

      return {
        ...state,
        tweets,
        error: undefined,
        count: tweets.length
      };
    }

    return {
      ...state
    };
  })
  .on(getTweets.done, (state, { result }) => {
    if (result && Array.isArray(result.tweets)) {
      return {
        ...state,
        error: undefined,
        tweets: state.tweets.concat(result.tweets),
        count: result.count,
        verifiedCount: result.verifiedCount,
        lastBlockNumber: Number(result.lastBlockNumber)
      };
    }

    return {
      ...state,
      error: true
    };
  })
  .on(clear, () => initalState)
  .on(add, (state, tweet) => {
    const { tweets } = state;

    tweets.splice(0, 0, tweet);

    return {
      ...state,
      tweets,
      count: state.count + 1,
      lastBlockNumber: Number(tweet.block)
    };
  })
  .on(setLastBlock, (state, blockNumber) => ({
    ...state,
    lastBlockNumber: Number(blockNumber)
  }))
  .on(deleteTweet.done, (state, { result }) => ({
    ...state,
    tweets: state.tweets.filter((tweet) => Number(tweet.id) !== Number(result))
  }))
  .on(payTweet.done, (state, { result }) => {
    if (!result || !result.message.includes('Added') || !result.tweet) {
      return state;
    } else if (state.tweets.some((t) => t.idStr === result.tweet.idStr)) {
      return state;
    }

    return {
      ...state,
      tweets: state.tweets.concat([result.tweet])
    };
  });

export default {
  store,
  update,
  updateTweets,
  getTweets,
  clear,
  setLastBlock,
  payTweet,
  setShowTwitterTweetEmbed,
  deleteTweet,
  add
};
