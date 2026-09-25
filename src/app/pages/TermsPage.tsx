import { useTranslation } from 'react-i18next';
import './LegalPages.css';

export function TermsPage() {
	const { t } = useTranslation();

	return (
		<article className="legal-page">
			<header className="terms-page__header">
				<h1>{t('terms.title')}</h1>
				<br />
				<time dateTime="2026-09-24">{t('terms.lastUpdated')}</time>
			</header>

			<section>
				<h2>1. {t('terms.about.title')}</h2>
				<p>{t('terms.about.body')}</p>
			</section>

			<section>
				<h2>2. {t('terms.accounts.title')}</h2>
				<p>{t('terms.accounts.body')}</p>
			</section>

			<section>
				<h2>{t('terms.acceptableUse.title')}</h2>
				<p>{t('terms.acceptableUse.introduction')}</p>

				<ul>
					<li>{t('terms.acceptableUse.harassment')}</li>
					<li>{t('terms.acceptableUse.cheating')}</li>
					<li>{t('terms.acceptableUse.impersonation')}</li>
					<li>{t('terms.acceptableUse.unauthorizedAccess')}</li>
					<li>{t('terms.acceptableUse.disruption')}</li>
					<li>{t('terms.acceptableUse.avatarContent')}</li>
				</ul>
			</section>

			<section>
				<h2>2. {t('terms.userContentAndIP.title')}</h2>
				<p>{t('terms.userContentAndIP.userContent')}</p>
				<p>{t('terms.userContentAndIP.intellectualProperty')}</p>
			</section>

			<section>
				<h2>5. {t('terms.enforcement.title')}</h2>
				<p>{t('terms.enforcement.restriction')}</p>
				<p>{t('terms.enforcement.deletionRequest')}</p>
				<p>{t('terms.enforcement.projectLifetime')}</p>
			</section>

			<section>
				<h2>6. {t('terms.disclaimer.title')}</h2>
				<p>{t('terms.disclaimer.availability')}</p>
				<p>{t('terms.disclaimer.liability')}</p>
			</section>

			<section>
				<h2>7. {t('terms.changes.title')}</h2>
				<p>{t('terms.changes.body')}</p>
			</section>

			<section>
				<h2>8. {t('terms.contact.title')}</h2>
				<p>{t('terms.contact.body')}</p>

				<a
					href="https://github.com/melmut-42/ft_transcendence"
					className="tooltip-link"
					data-tooltip={t('terms.contact.tooltip')}
					target="_blank"
					rel="external noopener noreferrer"
				>
					{t('terms.contact.repositoryLink')}
				</a>
			</section>
		</article>
	);
}
