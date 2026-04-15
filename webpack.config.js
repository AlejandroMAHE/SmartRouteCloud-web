 const path= require('path');
 const webpack = require('webpack');
 const htmlWebpackPlugin = require('html-webpack-plugin');
 
 module.exports={
    mode: 'development',
    entry: './src/cliente/js/index.js',
    output: {
        path:path.join(__dirname,'dist'),
        filename: 'bundle.js'
    },
    module:{
        rules:[
            {
                test:/\.css$/,
                use:['style-loader', 'css-loader']
            }
        ]
    },
    plugins:[
        new htmlWebpackPlugin({
            template: './src/cliente/index.html'
        }),
        new webpack.DefinePlugin({
      "process.env.FIREBASE_API_KEY": JSON.stringify(process.env.FIREBASE_API_KEY),
      "process.env.FIREBASE_AUTH_DOMAIN": JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN),
      "process.env.FIREBASE_PROJECT_ID": JSON.stringify(process.env.FIREBASE_PROJECT_ID),
    })
        
    ]

 };
 