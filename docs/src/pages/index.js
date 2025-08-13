import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import Heading from '@theme/Heading';
import styles from './index.module.css';
import Translate, {translate} from '@docusaurus/Translate';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <img src="./img/comodeling_illustration_blue.png" alt="Urban Model Builder Illustration" className={clsx(styles.heroImage)}/>
        <Heading as="h1" className="hero__title ">
          <Translate>Urban Model Builder - Handbuch</Translate>
        </Heading>
        <p className={clsx('hero__subtitle', styles.heroSubtitle)}>
          <Translate>Auf dieser Seite findest du eine Sammlung von Tutorials und Ressourcen, die dir helfen, den Urban Model Builder effektiv zu nutzen.</Translate>
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/documentation/intro">
            <Translate>Zur Dokumentation</Translate>
          </Link>
          
        </div>

      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
