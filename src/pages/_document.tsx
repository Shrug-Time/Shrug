import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Add any global meta tags here */}
      </Head>
      <body>
        <Main />
        <NextScript />
        {/* 
          Firebase will only be initialized on the client side
          because we properly guard the initialization in src/firebase.ts
        */}
      </body>
    </Html>
  )
} 