import fetch from 'isomorphic-unfetch';

import { APIs, HttpMethods, NUMBER_OF_TWEETS } from 'config';
import { FetchTweets, Twitte } from 'interfaces';

export const fetchTweets = async ({
  limit = NUMBER_OF_TWEETS,
  offset = 0
}): Promise<FetchTweets> => {
  const res = await fetch(`${APIs.getTweets}?limit=${limit}&offset=${offset}`, {
    credentials: 'include'
  });
  const result = await res.json();

  return result;
};

export const SearchTweet = async (query: string, jwt: string) => {
  const res = await fetch(`${APIs.searchTweet}/${query}`, {
    method: HttpMethods.POST,
    credentials: 'include',
    headers: {
      Authorization: jwt
    }
  });
  const result = await res.json();

  return result;
};

export const removeTweete = async (payload: { tweete: Twitte; jwt: string; }) => {
  const res = await fetch(`${APIs.rmTweet}/${payload.tweete.id}`, {
    method: HttpMethods.DELETE,
    credentials: 'include',
    headers: {
      Authorization: payload.jwt
    }
  });
  const result = await res.json();

  return result;
};
