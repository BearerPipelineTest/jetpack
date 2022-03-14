/**
 * WordPress dependencies
 */
import { InspectorControls } from '@wordpress/block-editor';
import {
	Button,
	PanelBody,
	PanelRow,
	SelectControl,
	TextControl,
	ExternalLink,
	Placeholder,
	Spinner,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { API_STATE_NOT_REQUESTING, API_STATE_REQUESTING } from './constants';
import { jetpackMembershipProductsStore } from './store';
import { CURRENCY_OPTIONS } from '../../currencies';

export default function ProductManagementInspectorControl( { saveProduct } ) {
	const { apiState, siteSlug } = useSelect( select => {
		const { getApiState, getSiteSlug } = select( jetpackMembershipProductsStore );
		return {
			apiState: getApiState(),
			siteSlug: getSiteSlug(),
		};
	} );
	const { setApiState } = useDispatch( jetpackMembershipProductsStore );

	const [ name, setName ] = useState( __( 'Monthly Subscription', 'jetpack' ) );
	const [ currency, setCurrency ] = useState( 'USD' );
	const [ price, setPrice ] = useState( 5 );
	const [ interval, setInterval ] = useState( '1 month' );

	const handleSubmit = event => {
		event.preventDefault();
		setApiState( API_STATE_REQUESTING );
		saveProduct( {}, success => {
			setApiState( API_STATE_NOT_REQUESTING );
			if ( success ) {
				setPrice( 5 );
				setName( '' );
			}
		} );
	};

	return (
		<InspectorControls>
			{ siteSlug && (
				<ExternalLink
					href={ `https://wordpress.com/earn/payments/${ siteSlug }` }
					className={ 'product-management-control-inspector__link-to-earn' }
				>
					{ __( 'Manage your subscriptions.', 'jetpack' ) }
				</ExternalLink>
			) }
			<PanelBody
				title={ __( 'Add a new subscription', 'jetpack' ) }
				initialOpen={ true }
				className={ 'product-management-control-inspector__add-plan' }
			>
				{ apiState === API_STATE_REQUESTING && (
					<Placeholder
						icon="lock"
						label={ __( 'Premium Content', 'jetpack' ) }
						instructions={ __( 'Saving plan…', 'jetpack' ) }
					>
						<Spinner />
					</Placeholder>
				) }
				{ apiState === API_STATE_NOT_REQUESTING && (
					<>
						<PanelRow className="product-management-control-inspector__product-name">
							<TextControl
								id="product-name"
								label={ __( 'Name', 'jetpack' ) }
								onChange={ value => setName( value ) }
								value={ name }
							/>
						</PanelRow>
						<PanelRow className="product-management-control-inspector__product-price">
							<SelectControl
								label={ __( 'Currency', 'jetpack' ) }
								onChange={ value => setCurrency( value ) }
								options={ CURRENCY_OPTIONS }
								value={ currency }
							/>
							<TextControl
								label={ __( 'Price', 'jetpack' ) }
								onChange={ value => setPrice( value ) }
								type="number"
								value={ price }
							/>
						</PanelRow>
						<PanelRow className="plan-interval">
							<SelectControl
								label={ __( 'Interval', 'jetpack' ) }
								onChange={ value => setInterval( value ) }
								options={ [
									{ label: __( 'Month', 'jetpack' ), value: '1 month' },
									{ label: __( 'Year', 'jetpack' ), value: '1 year' },
								] }
								value={ interval }
							/>
						</PanelRow>
						<PanelRow>
							<Button onClick={ handleSubmit } variant="secondary">
								{ __( 'Add subscription', 'jetpack' ) }
							</Button>
						</PanelRow>
					</>
				) }
			</PanelBody>
		</InspectorControls>
	);
}
