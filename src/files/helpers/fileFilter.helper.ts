
export const fileFilter = ( req: Express.Request, file: Express.Multer.File, callback: Function ) => {

    if ( !file ) return callback( new Error('File is empty'), false );

    const fileExtension = file.mimetype.split('/')[1];
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if ( validExtensions.includes( fileExtension ) ) {
        return callback( null, true );
    }

    callback( new Error(`File type not allowed. Accepted: ${validExtensions.join(', ')}`), false );

}
