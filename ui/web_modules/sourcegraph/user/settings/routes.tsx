// tslint:disable

import {rel} from "sourcegraph/app/routePatterns";
import {Route} from "react-router";
import {SettingsMain} from "sourcegraph/user/settings/SettingsMain";
import {UserSettingsReposMain} from "sourcegraph/user/settings/UserSettingsReposMain";

export const routes: ReactRouter.PlainRoute[] = [
	{
		path: rel.settings,
		getComponent: (location, callback) => {
			callback(null, {navContext: null, main: SettingsMain} as any);
		},
		childRoutes: [
			{
				path: rel.settingsRepos,
				getComponent: (location, callback) => {
					callback(null, {navContext: null, main: UserSettingsReposMain} as any);
				},
			},
		],
	},
];
