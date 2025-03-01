import {
	AdminPage,
	AdminSection,
	AdminSectionHero,
	Container,
	Col,
	getRedirectUrl,
	PricingCard,
} from '@automattic/jetpack-components';
import apiFetch from '@wordpress/api-fetch';
import { ExternalLink } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { createInterpolateElement, useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import useAnalytics from '../hooks/useAnalytics';
import useConnection from '../hooks/useConnection';
import { STORE_ID } from '../store';
import Backups from './Backups';
import ReviewRequest from './review-request';
import './admin-style.scss';
import './masthead/masthead-style.scss';

/* eslint react/react-in-jsx-scope: 0 */
const Admin = () => {
	const [ connectionStatus ] = useConnection();
	const [ capabilities, setCapabilities ] = useState( [] );
	const [ capabilitiesError, setCapabilitiesError ] = useState( null );
	const [ capabilitiesLoaded, setCapabilitiesLoaded ] = useState( false );
	const [ showHeaderFooter, setShowHeaderFooter ] = useState( true );
	const { tracks } = useAnalytics();
	const connectionLoaded = 0 < Object.keys( connectionStatus ).length;

	useEffect( () => {
		tracks.recordEvent( 'jetpack_backup_admin_page_view' );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	useEffect( () => {
		if ( ! connectionLoaded ) {
			return;
		}

		apiFetch( { path: '/jetpack/v4/backup-capabilities' } ).then(
			res => {
				setCapabilities( res.capabilities );
				setCapabilitiesLoaded( true );
			},
			() => {
				setCapabilitiesLoaded( true );
				setCapabilitiesError( 'Failed to fetch site capabilities' );
			}
		);
	}, [ connectionLoaded ] );

	const isFullyConnected = () => {
		return connectionLoaded && connectionStatus.isUserConnected && connectionStatus.isRegistered;
	};

	const hasBackupPlan = () => {
		return capabilities.includes( 'backup' );
	};

	return (
		<AdminPage
			withHeader={ false }
			withFooter={ false }
			moduleName={ __( 'Jetpack Backup', 'jetpack-backup-pkg' ) }
			a8cLogoHref="https://www.jetpack.com"
		>
			<div id="jetpack-backup-admin-container" className="jp-content">
				<div className="content">
					<AdminSectionHero>
						<Container horizontalSpacing={ 0 }>
							<Col>
								<div id="jp-admin-notices" className="jetpack-backup-jitm-card" />
							</Col>
						</Container>
						<LoadedState
							connectionLoaded={ connectionLoaded }
							connectionStatus={ connectionStatus }
							showHeaderFooter={ showHeaderFooter }
							setShowHeaderFooter={ setShowHeaderFooter }
							capabilitiesLoaded={ capabilitiesLoaded }
							hasBackupPlan={ hasBackupPlan() }
							capabilitiesError={ capabilitiesError }
						/>
					</AdminSectionHero>
					<AdminSection>
						{ isFullyConnected() && (
							<BackupSegments
								hasBackupPlan={ hasBackupPlan() }
								connectionLoaded={ connectionLoaded }
							/>
						) }
					</AdminSection>
				</div>
			</div>
		</AdminPage>
	);
};

// Renders additional segments under the jp-hero area condition on having a backup plan
const BackupSegments = ( hasBackupPlan, connectionLoaded ) => {
	const { tracks } = useAnalytics();
	const domain = useSelect( select => select( STORE_ID ).getCalypsoSlug(), [] );

	const trackLearnMoreClick = useCallback( () => {
		tracks.recordEvent( 'jetpack_backup_learn_more_click' );
	}, [ tracks ] );

	const trackSeeAllBackupsClick = useCallback( () => {
		tracks.recordEvent( 'jetpack_backup_see_all_backups_click', { site: domain } );
	}, [ tracks, domain ] );

	const trackSeeSiteActivityClick = useCallback( () => {
		tracks.recordEvent( 'jetpack_backup_see_site_activity_click', { site: domain } );
	}, [ tracks, domain ] );

	return (
		<Container horizontalSpacing={ 3 } horizontalGap={ 3 }>
			<Col lg={ 6 } md={ 4 }>
				<h2>{ __( 'Restore points created with every edit', 'jetpack-backup-pkg' ) }</h2>
				<p className="jp-realtime-note">
					{ createInterpolateElement(
						__(
							'No need to run a manual backup before you make changes to your site. <ExternalLink>Learn more</ExternalLink>',
							'jetpack-backup-pkg'
						),
						{
							ExternalLink: (
								<ExternalLink
									href={ getRedirectUrl( 'jetpack-blog-realtime-mechanics' ) }
									onClick={ trackLearnMoreClick }
								/>
							),
						}
					) }
				</p>

				<h2>{ __( 'Where are backups stored?', 'jetpack-backup-pkg' ) }</h2>
				<p>
					{ __(
						'All the backups are safely stored in the cloud and available for you at any time on Jetpack.com, with full details about status and content.',
						'jetpack-backup-pkg'
					) }
				</p>
				{ hasBackupPlan && (
					<p>
						<ExternalLink
							href={ getRedirectUrl( 'jetpack-backup', { site: domain } ) }
							onClick={ trackSeeAllBackupsClick }
						>
							{ __( 'See all your backups', 'jetpack-backup-pkg' ) }
						</ExternalLink>
					</p>
				) }
			</Col>
			<Col lg={ 1 } md={ 1 } sm={ 0 } />
			<Col lg={ 5 } md={ 3 } sm={ 4 }>
				<h2>{ __( "Your site's heartbeat", 'jetpack-backup-pkg' ) }</h2>
				<p>
					{ __(
						'The activity log lets you see everything that’s going on with your site outlined in an organized, readable way.',
						'jetpack-backup-pkg'
					) }
				</p>
				{ hasBackupPlan && (
					<p>
						<ExternalLink
							href={ getRedirectUrl( 'backup-plugin-activity-log', { site: domain } ) }
							onClick={ trackSeeSiteActivityClick }
						>
							{ __( "See your site's activity", 'jetpack-backup-pkg' ) }
						</ExternalLink>
					</p>
				) }
			</Col>
			<ReviewMessage connectionLoaded={ connectionLoaded } />
		</Container>
	);
};

const ReviewMessage = connectionLoaded => {
	const [ restores ] = useRestores( connectionLoaded );
	const [ backups ] = useBackups( connectionLoaded );
	const { tracks } = useAnalytics();
	let requestReason = '';
	let reviewText = '';

	// Check if the site has a successful restore not older than 15 days
	const hasRecentSuccesfulRestore = () => {
		if ( restores[ 0 ] && restores[ 0 ].status === 'finished' ) {
			// Number of days we consider the restore recent
			const maxDays = 15;
			const daysDifference = ( new Date() - Date.parse( restores[ 0 ].when ) ) / 86400000;
			if ( daysDifference < maxDays ) {
				return true;
			}
		}

		return false;
	};

	// Check if the last 5 backups were successful
	const hasFiveSuccessfulBackups = () => {
		if ( ! Array.isArray( backups ) || backups.length < 5 ) {
			return false;
		}

		let fiveSuccessfulBackups = true;
		backups.slice( 0, 5 ).forEach( backup => {
			if ( ! 'finished' === backup.status || ! backup.stats ) {
				fiveSuccessfulBackups = false;
			}
		} );

		return fiveSuccessfulBackups;
	};

	const trackSendToReview = useCallback( () => {
		tracks.recordEvent( 'jetpack_backup_new_review_click' );
	}, [ tracks ] );

	if ( hasRecentSuccesfulRestore() ) {
		requestReason = 'restore';
		reviewText = __( 'Was it easy to restore your site?', 'jetpack-backup-pkg' );
	} else if ( hasFiveSuccessfulBackups() ) {
		requestReason = 'backups';
		reviewText = __(
			'Do you enjoy the peace of mind of having real-time backups?',
			'jetpack-backup-pkg'
		);
	}

	const [ dismissedReview, dismissMessage ] = useDismissedReviewRequest(
		connectionLoaded,
		requestReason
	);

	if ( ! hasRecentSuccesfulRestore() && ! hasFiveSuccessfulBackups() ) {
		return null;
	}

	return (
		<Col lg={ 6 } md={ 4 }>
			<ReviewRequest
				cta={ createInterpolateElement(
					__(
						'<strong>Please leave a review and help us spread the word!</strong>',
						'jetpack-backup-pkg'
					),
					{
						strong: <strong></strong>,
					}
				) }
				// eslint-disable-next-line react/jsx-no-bind
				href={ getRedirectUrl( 'jetpack-backup-new-review' ) }
				onClick={ trackSendToReview }
				requestReason={ requestReason }
				reviewText={ reviewText }
				dismissedReview={ dismissedReview }
				// eslint-disable-next-line react/jsx-no-bind
				dismissMessage={ dismissMessage }
			/>
		</Col>
	);
};

const useRestores = connectionLoaded => {
	const [ restores, setRestores ] = useState( [] );

	useEffect( () => {
		if ( ! connectionLoaded ) {
			setRestores( [] );
			return;
		}
		apiFetch( { path: '/jetpack/v4/restores' } ).then(
			res => {
				setRestores( res );
			},
			() => {
				setRestores( [] );
			}
		);
	}, [ setRestores, connectionLoaded ] );

	return [ restores, setRestores ];
};

const useBackups = connectionLoaded => {
	const [ backups, setBackups ] = useState( [] );

	useEffect( () => {
		if ( ! connectionLoaded ) {
			setBackups( [] );
			return;
		}
		apiFetch( { path: '/jetpack/v4/backups' } ).then(
			res => {
				setBackups( res );
			},
			() => {
				setBackups( [] );
			}
		);
	}, [ setBackups, connectionLoaded ] );

	return [ backups, setBackups ];
};

const useDismissedReviewRequest = ( connectionLoaded, requestReason ) => {
	const [ dismissedReview, setDismissedReview ] = useState( true );

	useEffect( () => {
		if ( ! connectionLoaded || ! requestReason ) {
			return;
		}
		apiFetch( {
			path: '/jetpack/v4/site/dismissed-review-request',
			method: 'POST',
			data: {
				option_name: requestReason,
				should_dismiss: false,
			},
		} ).then(
			res => {
				setDismissedReview( res );
			},
			() => {
				setDismissedReview( true );
			}
		);
	}, [ setDismissedReview, connectionLoaded, requestReason ] );

	const dismissMessage = e => {
		e.preventDefault();
		apiFetch( {
			path: '/jetpack/v4/site/dismissed-review-request',
			method: 'POST',
			data: {
				option_name: requestReason,
				should_dismiss: true,
			},
		} ).then( setDismissedReview( true ) );
	};
	return [ dismissedReview, dismissMessage, setDismissedReview ];
};

const NoBackupCapabilities = () => {
	const { tracks } = useAnalytics();
	const [ priceAfter, setPriceAfter ] = useState( 0 );
	const [ price, setPrice ] = useState( 0 );
	const domain = useSelect( select => select( STORE_ID ).getCalypsoSlug(), [] );

	useEffect( () => {
		apiFetch( { path: '/jetpack/v4/backup-promoted-product-info' } ).then( res => {
			setPrice( res.cost / 12 );
			if ( res.introductory_offer ) {
				setPriceAfter( res.introductory_offer.cost_per_interval / 12 );
			} else {
				setPriceAfter( res.cost / 12 );
			}
		} );
	}, [] );

	const sendToCart = useCallback( () => {
		tracks.recordEvent( 'jetpack_backup_plugin_upgrade_click', { site: domain } );
		window.location.href = getRedirectUrl( 'backup-plugin-upgrade-10gb', { site: domain } );
	}, [ tracks, domain ] );

	const basicInfoText = __( '14 day money back guarantee.', 'jetpack-backup-pkg' );
	const introductoryInfoText = __(
		'Special introductory pricing, all renewals are at full price. 14 day money back guarantee.',
		'jetpack-backup-pkg'
	);
	return (
		<Container horizontalSpacing={ 3 } horizontalGap={ 3 }>
			<Col lg={ 6 } md={ 6 } sm={ 4 }>
				<h1>{ __( 'Secure your site with a Backup subscription.', 'jetpack-backup-pkg' ) }</h1>
				<p>
					{ ' ' }
					{ __(
						'Get peace of mind knowing that all your work will be saved, and get back online quickly with one-click restores.',
						'jetpack-backup-pkg'
					) }
				</p>
				<ul className="jp-product-promote">
					<li>{ __( 'Automated real-time backups', 'jetpack-backup-pkg' ) }</li>
					<li>{ __( 'Easy one-click restores', 'jetpack-backup-pkg' ) }</li>
					<li>{ __( 'Complete list of all site changes', 'jetpack-backup-pkg' ) }</li>
					<li>{ __( 'Global server infrastructure', 'jetpack-backup-pkg' ) }</li>
					<li>{ __( 'Best-in-class support', 'jetpack-backup-pkg' ) }</li>
				</ul>
			</Col>
			<Col lg={ 1 } md={ 1 } sm={ 0 } />
			<Col lg={ 5 } md={ 6 } sm={ 4 }>
				<PricingCard
					ctaText={ __( 'Get Jetpack Backup', 'jetpack-backup-pkg' ) }
					icon="data:image/svg+xml,%3Csvg width='32' height='32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='m21.092 15.164.019-1.703v-.039c0-1.975-1.803-3.866-4.4-3.866-2.17 0-3.828 1.351-4.274 2.943l-.426 1.524-1.581-.065a2.92 2.92 0 0 0-.12-.002c-1.586 0-2.977 1.344-2.977 3.133 0 1.787 1.388 3.13 2.973 3.133H22.399c1.194 0 2.267-1.016 2.267-2.4 0-1.235-.865-2.19-1.897-2.368l-1.677-.29Zm-10.58-3.204a4.944 4.944 0 0 0-.201-.004c-2.75 0-4.978 2.298-4.978 5.133s2.229 5.133 4.978 5.133h12.088c2.357 0 4.267-1.97 4.267-4.4 0-2.18-1.538-3.99-3.556-4.339v-.06c0-3.24-2.865-5.867-6.4-5.867-2.983 0-5.49 1.871-6.199 4.404Z' fill='%23000'/%3E%3C/svg%3E"
					infoText={ priceAfter === price ? basicInfoText : introductoryInfoText }
					// eslint-disable-next-line react/jsx-no-bind
					onCtaClick={ sendToCart }
					priceAfter={ priceAfter }
					priceBefore={ price }
					title={ __( 'Jetpack Backup', 'jetpack-backup-pkg' ) }
				/>
			</Col>
		</Container>
	);
};

const LoadedState = ( {
	connectionLoaded,
	showHeaderFooter,
	setShowHeaderFooter,
	capabilitiesLoaded,
	hasBackupPlan,
	capabilitiesError,
} ) => {
	const [ connectionStatus, renderConnectScreen ] = useConnection();

	if (
		! connectionLoaded ||
		! connectionStatus.isUserConnected ||
		! connectionStatus.isRegistered
	) {
		if ( showHeaderFooter ) {
			setShowHeaderFooter( false );
		}

		return (
			<Container horizontalSpacing={ 3 } horizontalGap={ 3 }>
				<Col lg={ 12 } md={ 8 } sm={ 4 }>
					{ renderConnectScreen() }
				</Col>
			</Container>
		);
	}

	// Show header and footer on all screens except ConnectScreen
	if ( ! showHeaderFooter ) {
		setShowHeaderFooter( true );
	}

	if ( ! capabilitiesLoaded ) {
		return <div></div>;
	}

	if ( hasBackupPlan ) {
		return (
			<Container horizontalSpacing={ 5 } fluid>
				<Col>
					<Backups />
				</Col>
			</Container>
		);
	}

	// Render an error state, this shouldn't occurr since we've passed userConnected checks
	if ( capabilitiesError ) {
		return (
			<Container horizontalSpacing={ 3 }>
				<Col lg={ 12 } md={ 8 } sm={ 4 }>
					{ capabilitiesError }
				</Col>
			</Container>
		);
	}

	return <NoBackupCapabilities />;
};

export default Admin;
