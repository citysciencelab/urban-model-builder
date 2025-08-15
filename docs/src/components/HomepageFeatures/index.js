import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import Translate, {translate} from '@docusaurus/Translate';

const FeatureList = [
  {
    title: (
      <Translate>
        Kollaboration in Echtzeit
      </Translate>
    ),
    img: require('@site/static/img/modelbuilder_collaboration_whiteBG.png').default,
    description: (
      <Translate>
        Arbeite gemeinsam mit deinem Team und anderen Stakeholdern an urbanen Modellen in Echtzeit.
      </Translate>
    ),
  },
  {
    title: (
      <Translate>
        Integration der Städtischen Datenplattform
      </Translate>
    ),
    img: require('@site/static/img/modelbuilder_dataplatform_whiteBG.png').default,
    description: (
      <Translate>
        Der Urban Model Builder ist vollständig in die Städtische Datenplattform integriert, um den Zugriff auf städtische Daten zu erleichtern.
      </Translate>
    ),
  },
  {
    title: (
      <Translate>
        System Dynamics und Agentenbasierte Modellierung
      </Translate>
    ),
    img: require('@site/static/img/modelbuilder_sd_abm_whiteBG.png').default,
    description: (
      <Translate>
        Der Urban Model Builder unterstützt sowohl System Dynamics als auch agentenbasierte Modellierung, um verschiedene Aspekte städtischer Systeme zu modellieren.
      </Translate>
    ),
  },
];

function Feature({img, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img src={img} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
