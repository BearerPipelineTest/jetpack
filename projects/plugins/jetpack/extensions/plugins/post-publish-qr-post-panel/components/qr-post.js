/**
 * External dependencies
 */
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { Component, Button, Modal } from '@wordpress/components';
import { useRef, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { JetpackLogo, QRCode } from '@automattic/jetpack-components';

/**
 * Internal dependencies
 */
import useSiteLogo from '../hooks/use-site-logo.js';
import { handleDownloadQRCode } from '../utils/handle-download-qr-code.js';

/**
 * React component that renders a QR code for the post,
 * pulling the post data from the editor store.
 *
 * @returns {Component} The react component.
 */
export function QRPost() {
	const wrapperElementRef = useRef();

	// Pick and convert Jetpack logo to data image.
	const [ jetpackLogoUrl, setJetpackLogo ] = useState();
	useEffect( () => {
		if ( ! wrapperElementRef?.current ) {
			return;
		}

		const svgJetpackLogo = wrapperElementRef.current.querySelector( 'svg' );
		if ( ! svgJetpackLogo ) {
			return;
		}

		const serializedSVG = new XMLSerializer().serializeToString( svgJetpackLogo );
		setJetpackLogo( `data:image/svg+xml;base64,${ window.btoa( serializedSVG ) }` );
	}, [ wrapperElementRef ] );

	// Pick title and permalink post.
	const permalink = useSelect( select => select( editorStore ).getPermalink(), [] );
	const { dataUrl: siteLogoUrl } = useSiteLogo( { generateDataUrl: true } );
	const codeLogo = siteLogoUrl || jetpackLogoUrl;

	return (
		<div ref={ wrapperElementRef }>
			<QRCode
				value={ permalink }
				size={ 300 }
				imageSettings={
					codeLogo && {
						src: codeLogo,
						width: 48,
						height: 48,
						excavate: true,
					}
				}
				renderAs="canvas"
				level="H"
			/>

			<JetpackLogo className="qr-post-jetpack-logo" width={ 48 } height={ 48 } showText={ false } />
		</div>
	);
}

export function QRPostButton() {
	const qrCodeRef = useRef();
	const slug = useSelect( select => select( editorStore ).getEditedPostSlug(), [] );
	const [ isModalOpen, setIsModalOpen ] = useState( false );
	const switchModal = () => setIsModalOpen( v => ! v );
	const closeModal = () => setIsModalOpen( false );

	return (
		<div className="qr-post-button">
			<Button isSecondary onClick={ switchModal }>
				{ __( 'Get QR code', 'jetpack' ) }
			</Button>

			{ isModalOpen && (
				<Modal
					title={ __( 'QR Post code', 'jetpack' ) }
					onRequestClose={ closeModal }
					className="qr-post-modal"
				>
					<div className="qr-post-modal__qr-code" ref={ qrCodeRef }>
						<QRPost />
					</div>

					<div className="qr-post-modal__actions_buttons">
						<Button isSecondary onClick={ () => handleDownloadQRCode( slug, qrCodeRef ) }>
							{ __( 'Download', 'jetpack' ) }
						</Button>

						<Button isSecondary onClick={ closeModal }>
							{ __( 'Close', 'jetpack' ) }
						</Button>
					</div>
				</Modal>
			) }
		</div>
	);
}
