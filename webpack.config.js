const webpack = require("webpack");
const path = require("path");
const mode = process.env.NODE_ENV;
const dev = mode === "development";

module.exports = {
	entry: "./src/index.ts",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "build/[name].js",
	},
	resolve: {
		extensions: [".mjs", ".ts", ".js"],
		mainFields: ["browser", "module", "main"],
	},
	module: {
		rules: [{ test: /\.m?[jt]sx?$/, use: { loader: "babel-loader" } }],
	},
	plugins: [
		// dev && new webpack.HotModuleReplacementPlugin(),
		new webpack.DefinePlugin({
			"process.browser": true,
			"process.env.NODE_ENV": JSON.stringify(mode),
		}),
	].filter(Boolean),
	mode,
	devtool: dev && "eval-source-map",
	devServer: {
		contentBase: path.join(__dirname, "dist"),
		compress: true,
		port: 9000,
	},
};
