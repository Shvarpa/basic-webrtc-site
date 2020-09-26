const { ModuleKind } = require("typescript");

module.exports = {
	presets: [
		[
			"@babel/preset-typescript",
			{
				useBuiltIns: "usage",
				corejs: 3,
				targets: "> 0.25%, not dead",
				loose: true,
			},
		],
	],
};
