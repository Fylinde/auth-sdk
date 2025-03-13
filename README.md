<div align="center">
  <img width="150" alt="" src="https://github.com/fylinde/auth-sdk/assets/1338731/c90a73d0-5ef1-4d09-9347-c5d02cd7244d">
</div>

<div align="center">
  
# Fylinde Auth SDK

Fylinde Auth SDK integrates secure and customizable authentication and authorization into storefronts using Fylinde.

**Below 3kB bundle size (gzipped).**

</div>

<div align="center">
  <a href="https://www.npmjs.com/package/@fylinde/auth-sdk">npm</a>
  <span> • </span>
  <a href="https://docs.fylinde.io/docs/3.x/api-usage/authentication">Docs</a>
  <span> • </span>
  <a href="https://twitter.com/getFylinde">Twitter</a>
  <span> • </span>
  <a href="https://discord.gg/H52JTZAtSH">Discord</a>
</div>

<br/>

<div align="center">

[![Discord Badge](https://dcbadge.vercel.app/api/server/H52JTZAtSH)](https://discord.gg/H52JTZAtSH)

</div>

## Usage

### Next.js App Router

Next.js 13+ App Router is the recommended way to use the Fylinde Auth SDK. It is the easiest to set up and provides the best user experience.

In order to use Fylinde Auth SDK in React Server Components, the client needs to be created in the following way:

```ts
import { createFylindeAuthClient } from "@fylinde/auth-sdk";
import { getNextServerCookiesStorage } from "@fylinde/auth-sdk/next/server";

const getServerAuthClient = () => {
  const nextServerCookiesStorage = getNextServerCookiesStorage();
  return createFylindeAuthClient({
    fylindeApiUrl: "…",
    refreshTokenStorage: nextServerCookiesStorage,
    accessTokenStorage: nextServerCookiesStorage,
  });
};
```

Logging in can be implemented via Server Actions:

```tsx
<form
  className="bg-white shadow-md rounded p-8"
  action={async (formData) => {
    "use server";

    await getServerAuthClient().signIn(
      {
        email: formData.get("email").toString(),
        password: formData.get("password").toString(),
      },
      { cache: "no-store" },
    );
  }}
>
  {/* … rest of the form … */}
</form>
```

Then, you can use `fylindeAuthClient.fetchWithAuth` directly for any queries and mutations.

For a full working example, see the [Fylinde Auth SDK example](https://github.com/fylinde/example-auth-sdk/tree/app/ssr/page.tsx).

### Next.js Pages Router with [Apollo Client](https://www.apollographql.com/docs/react/)

<details>
  <summary>Step-by-step video tutorial</summary>

Check the following [step-by-step video](https://www.youtube.com/watch?v=XY1t8JiPwk0) guide on how to set this up.
[![Fylinde Auth with Next.js](https://img.youtube.com/vi/t6nxBk7JHCw/0.jpg)](https://www.youtube.com/watch?v=XY1t8JiPwk0)

</details>

When using Next.js (Pages Router) along with [Apollo Client](https://www.apollographql.com/docs/react/), there are two essential steps to setting up your application. First, you have to surround your application's root with two providers: `<FylindeAuthProvider>` and `<ApolloProvider>`.

`<FylindeAuthProvider>` comes from our React.js-auth package, located at `@fylinde/auth-sdk/react`, and it needs to be set up with the Fylinde auth client instance.

The `<ApolloProvider>` comes from `@apollo/client` and it needs the live GraphQL client instance, which is enhanced with the authenticated `fetch` that comes from the Fylinde auth client.

Lastly, you must run the `useAuthChange` hook. This links the `onSignedOut` and `onSignedIn` events.

Let's look at an example:

```tsx
import { AppProps } from "next/app";
import { ApolloProvider, ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { createFylindeAuthClient } from "@fylinde/auth-sdk";
import { FylindeAuthProvider, useAuthChange } from "@fylinde/auth-sdk/react";

const fylindeApiUrl = "<your fylinde API URL>";

// Fylinde Client
const FylindeAuthClient = createFylindeAuthClient({ fylindeApiUrl });

// Apollo Client
const httpLink = createHttpLink({
  uri: fylindeApiUrl,
  fetch: fylindeAuthClient.fetchWithAuth,
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

export default function App({ Component, pageProps }: AppProps) {
  useAuthChange({
    fylindeApiUrl,
    onSignedOut: () => apolloClient.resetStore(),
    onSignedIn: () => {
      apolloClient.refetchQueries({ include: "all" });
    },
  });

  return (
    <FylindeAuthProvider client={fylindeAuthClient}>
      <ApolloProvider client={apolloClient}>
        <Component {...pageProps} />
      </ApolloProvider>
    </FylindeAuthProvider>
  );
}
```

Then, in your register, login and logout forms you can use the auth methods (`signIn`, `signOut`, `isAuthenticating`) provided by the `useFylindeAuthContext()`. For example, `signIn` is usually triggered when submitting the login form credentials.

```tsx
import React, { FormEvent } from "react";
import { useFylindeAuthContext } from "@fylinde/auth-sdk/react";
import { gql, useQuery } from "@apollo/client";

const CurrentUserDocument = gql`
  query CurrentUser {
    me {
      id
      email
      firstName
      lastName
      avatar {
        url
        alt
      }
    }
  }
`;

export default function LoginPage() {
  const { signIn, signOut } = useFylindeAuthContext();

  const { data: currentUser, loading } = useQuery(CurrentUserDocument);

  const submitHandler = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = await signIn({
      email: "admin@example.com",
      password: "admin",
    });

    if (result.data.tokenCreate.errors) {
      // handle errors
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <main>
      {currentUser?.me ? (
        <>
          <div>Display user {JSON.stringify(currentUser)}</div>
          <button className="button" onClick={() => signOut()}>
            Log Out
          </button>
        </>
      ) : (
        <div>
          <form onSubmit={submitHandler}>
            {/* You must connect your inputs to state or use a form library such as react-hook-form */}
            <input type="email" name="email" placeholder="Email" />
            <input type="password" name="password" placeholder="Password" />
            <button className="button" type="submit">
              Log In
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
```

### Next.js (Pages Router) with [urql](https://formidable.com/open-source/urql/)

When using Next.js (Pages Router) along with [urql](https://formidable.com/open-source/urql/) client, there are two essential steps to setting up your application. First, you have to surround your application's root with two providers: `<FylindeAuthProvider>` and `<Provider>`.

`<FylindeAuthProvider>` comes from our React.js-auth package, located at `@fylinde/auth-sdk/react`, and it needs to be set up with the Fylinde auth client.

The `<Provider>` comes from `urql` and it needs the GraphQL client instance, which is enhanced with the authenticated `fetch` that comes from the Fylinde auth client.

Lastly, you must run the `useAuthChange` hook. This links the `onSignedOut` and `onSignedIn` events and is meant to refresh the GraphQL store and in-flight active GraphQL queries.

Let's look at an example:

```tsx
import { AppProps } from "next/app";
import { Provider, cacheExchange, fetchExchange, ssrExchange } from "urql";
import { FylindeAuthProvider, useAuthChange } from "@fylinde/auth-sdk/react";

const fylindeApiUrl = "<your Fylinde API URL>";

const fylindeAuthClient = createFylindeAuthClient({ fylindeApiUrl });

const makeUrqlClient = () =>
  createClient({
    url: fylindeApiUrl,
    fetch: fylindeAuthClient.fetchWithAuth,
    exchanges: [cacheExchange, fetchExchange],
  });

export default function App({ Component, pageProps }: AppProps) {
  // https://github.com/urql-graphql/urql/issues/297#issuecomment-504782794
  const [urqlClient, setUrqlClient] = useState<Client>(makeUrqlClient());

  useAuthChange({
    fylindeApiUrl,
    onSignedOut: () => setUrqlClient(makeUrqlClient()),
    onSignedIn: () => setUrqlClient(makeUrqlClient()),
  });

  return (
    <FylindeAuthProvider client={fylindeAuthClient}>
      <Provider value={urqlClient}>
        <Component {...pageProps} />
      </Provider>
    </FylindeAuthProvider>
  );
}
```

Then, in your register, login and logout forms you can use the auth methods (`signIn`, `signOut`) provided by the `useFylindeAuthContext()`. For example, `signIn` is usually triggered when submitting the login form credentials.

```tsx
import React, { FormEvent } from "react";
import { useFylindeAuthContext } from "@fylinde/auth-sdk/react";
import { gql, useQuery } from "urql";

const CurrentUserDocument = gql`
  query CurrentUser {
    me {
      id
      email
      firstName
      lastName
      avatar {
        url
        alt
      }
    }
  }
`;

export default function LoginPage() {
  const { signIn, signOut } = useFylindeAuthContext();

  const [{ data: currentUser, fetching: loading }] = useQuery({
    query: CurrentUserDocument,
    pause: isAuthenticating,
  });

  const submitHandler = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = await signIn({
      email: "admin@example.com",
      password: "admin",
    });

    if (result.data.tokenCreate.errors) {
      // handle errors
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <main>
      {currentUser?.me ? (
        <>
          <div>Display user {JSON.stringify(currentUser)}</div>
          <button className="button" onClick={() => signOut()}>
            Log Out
          </button>
        </>
      ) : (
        <div>
          <form onSubmit={submitHandler}>
            {/* You must connect your inputs to state or use a form library such as react-hook-form */}
            <input type="email" name="email" placeholder="Email" />
            <input type="password" name="password" placeholder="Password" />
            <button className="button" type="submit">
              Log In
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
```

### Next.js (Pages Router) with OpenID Connect

Setup `_app.tsx` as described above. In your login component trigger the external auth flow using the following code:

```tsx
import { useFylindeAuthContext, useFylindeExternalAuth } from "@fylinde/auth-sdk/react";
import { ExternalProvider } from "@fylinde/auth-sdk";
import Link from "next/link";
import { gql, useQuery } from "@apollo/client";

export default function Home() {
  const {
    loading: isLoadingCurrentUser,
    error,
    data,
  } = useQuery(gql`
    query CurrentUser {
      me {
        id
        email
        firstName
        lastName
      }
    }
  `);
  const { authURL, loading: isLoadingExternalAuth } = useFylindeExternalAuth({
    fylindeApiUrl,
    provider: ExternalProvider.OpenIDConnect,
    redirectURL: "<your Next.js app>/api/auth/callback",
  });

  const { signOut } = useFylindeAuthContext();

  if (isLoadingExternalAuth || isLoadingCurrentUser) {
    return <div>Loading...</div>;
  }

  if (data?.me) {
    return (
      <div>
        {JSON.stringify(data)}
        <button onClick={() => signOut()}>Logout</button>
      </div>
    );
  }
  if (authURL) {
    return (
      <div>
        <Link href={authURL}>Login</Link>
      </div>
    );
  }
  return <div>Something went wrong</div>;
}
```

You also need to define the auth callback. In `pages/api/auth` create the `callback.ts` with the following content:

```ts
import { ExternalProvider, FylindeExternalAuth } from "@fylinde/auth-sdk";
import { createFylindeExternalAuthHandler } from "@fylinde/auth-sdk/next";

const externalAuth = new FylindeExternalAuth("<your Fylinde instance URL>", ExternalProvider.OpenIDConnect);

export default createFylindeExternalAuthHandler(externalAuth);
```

## FAQ

## How do I reset password?

The `FylindeAuthClient` class provides you with a reset password method. If the reset password mutation is successful, it will log you in automatically, just like after a regular sign-in. The [`onSignIn` method of `useAuthChange` hook](#how-do-i-tell-my-graphql-client-to-refresh-queries-on-signin--signout) will also be triggered.

```javascript
const { resetPassword } = useFylindeAuthContext();

const response = await resetPassword({
  email: "example@mail.com",
  password: "newPassword",
  token: "apiToken",
});
```
