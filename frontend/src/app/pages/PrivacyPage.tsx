import { useTranslation } from 'react-i18next';

export function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <article className="mx-auto flex max-w-prose flex-col gap-4 px-3 py-4">
      <header className="flex flex-col gap-2">
        <h1>{t('privacy.title')}</h1>
        <br />
        <time dateTime="2026-09-24">{t('privacy.lastUpdated')}</time>
      </header>

      <section className="flex flex-col gap-2">
        <h2>{t('privacy.about.title')}</h2>
        <p>{t('privacy.about.educationalProject')}</p>
        <p>{t('privacy.about.independentProject')}</p>
        <p>{t('privacy.about.policyPurpose')}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2>{t('privacy.dataAndPrivacy.title')}</h2>

        <section className="flex flex-col gap-2">
          <h3>{t('privacy.dataCollected.title')}</h3>
          <p>{t('privacy.dataCollected.introduction')}</p>
          <ul className="flex list-disc flex-col gap-1 pl-4">
            <li>{t('privacy.dataCollected.account')}</li>
            <li>{t('privacy.dataCollected.password')}</li>
            <li>{t('privacy.dataCollected.profile')}</li>
            <li>{t('privacy.dataCollected.gameplay')}</li>
            <li>{t('privacy.dataCollected.social')}</li>
            <li>{t('privacy.dataCollected.onlineStatus')}</li>
            <li>{t('privacy.dataCollected.session')}</li>
            <li>{t('privacy.dataCollected.language')}</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h3>{t('privacy.dataUse.title')}</h3>
          <p>{t('privacy.dataUse.body')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h3>{t('privacy.visibility.title')}</h3>
          <p>{t('privacy.visibility.body')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h3>{t('privacy.storage.title')}</h3>
          <p>{t('privacy.storage.retention')}</p>
          <p>{t('privacy.storage.security')}</p>
          <p>{t('privacy.storage.sensitiveInformation')}</p>
        </section>
      </section>

      <section className="flex flex-col gap-2">
        <h2>{t('privacy.choicesAndUpdates.title')}</h2>

        <section className="flex flex-col gap-2">
          <h3>{t('privacy.choices.title')}</h3>
          <p>{t('privacy.choices.body')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h3>{t('privacy.changes.title')}</h3>
          <p>{t('privacy.changes.body')}</p>
        </section>
      </section>

      <section className="flex flex-col gap-2">
        <h2>{t('privacy.contact.title')}</h2>
        <p>{t('privacy.contact.body')}</p>

        <a
          href="https://github.com/melmut-42/ft_transcendence"
          className="tooltip-link w-fit"
          data-tooltip={t('privacy.contact.tooltip')}
          target="_blank"
          rel="external noopener noreferrer"
        >
          {t('privacy.contact.repositoryLink')}
        </a>
      </section>
    </article>
  );
}
