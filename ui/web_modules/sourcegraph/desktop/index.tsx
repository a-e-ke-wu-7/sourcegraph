// tslint:disable

import * as React from "react";
import {DesktopHome, NotInBeta} from "sourcegraph/desktop/DesktopHome";

import {rel} from "sourcegraph/app/routePatterns";
import {inBeta} from "sourcegraph/user/index";
import * as betautil from "sourcegraph/util/betautil";
import {getRouteName} from "sourcegraph/app/routePatterns";
import {desktopContainer} from "sourcegraph/desktop/DesktopContainer";

export const routes = [
	{
		getComponent: (location, callback) => {
			callback(null, {
				main: DesktopHome,
			});
		},
		path: rel.desktopHome,
	},
];

export function desktopRouter(Component) {
	type Props = {
		routes: any[],
	};

	class DesktopRouter extends React.Component<Props, any> {
		static contextTypes = {
			router: React.PropTypes.object.isRequired,
			user: React.PropTypes.object,
			signedIn: React.PropTypes.bool.isRequired,
		};

		render(): JSX.Element | null {
			const inbeta = inBeta((this.context as any).user, betautil.DESKTOP);
			// Include this.context.user to prevent flicker when user loads
			if ((this.context as any).signedIn && (this.context as any).user && !inbeta) {
				return <NotInBeta />;
			}

			if (getRouteName(this.props.routes) === "home") {
				if (!(this.context as any).signedIn) {
					// Prevent unauthed users from escaping
					(this.context as any).router.replace(rel.login);
				} else {
					(this.context as any).router.replace(rel.desktopHome);
				}
			}

			return <Component {...this.props} />;
		}
	}

	if (global.document) {
		const desktopClient = navigator.userAgent.includes("Electron");
		if (desktopClient) {
			return desktopContainer(DesktopRouter);
		}
	}

	return Component;
}
