// eslint-disable-next-line no-unused-vars
/* global myJetpackInitialState */

/**
 * External dependencies
 */
import { getRedirectUrl } from '@automattic/jetpack-components';

/**
 * Internal dependencies
 */
import { MY_JETPACK_MY_PLANS_PURCHASE_SOURCE } from '../constants';

/**
 * Return the redurect URL for purchasing a plan, according to the Jetpack redurects source.
 *
 * @returns {string}            the redirect URL
 */
export default function () {
	const site = window?.myJetpackInitialState?.siteSuffix;
	return getRedirectUrl( MY_JETPACK_MY_PLANS_PURCHASE_SOURCE, { site } );
}