import {config} from 'dotenv';
config( {path: 'src/environments/.env.dev'} );

export default {
    botPhoneNumber: process.env.PHONE_NUMBER ?? '',
}