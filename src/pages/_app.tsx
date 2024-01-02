import Head from 'next/head';
import { AppProps } from 'next/app';

import './styles.css';
import styles from './MainLayout.module.css';


const title = 'WebGPU Samples';

const MainLayout: React.FunctionComponent<AppProps> = ({
  Component,
  pageProps,
}) => {

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta
          name="description"
          content="The WebGPU Samples are a set of samples demonstrating the use of the WebGPU API."
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
      </Head>
      <div className={styles.wrapper}>
        <Component {...pageProps} />
      </div>
    </>
  );
};

export default MainLayout;
