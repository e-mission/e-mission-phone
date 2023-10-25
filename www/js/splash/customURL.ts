type UrlComponents = {
    [key : string] : string
}

type OnLaunchCustomURL = (rawUrl: string, callback: (url: string, urlComponents: UrlComponents) => void ) => void;


export const onLaunchCustomURL: OnLaunchCustomURL = (rawUrl, handler) => {
    try {
        const url = rawUrl.split('//')[1];
        const [ route, paramString ] = url.split('?');
        const paramsList = paramString.split('&');
        const urlComponents: UrlComponents = { route : route };
        for (let i = 0; i < paramsList.length; i++) {
            const [key, value] = paramsList[i].split('=');
            urlComponents[key] = value;
        }
        handler(url, urlComponents);
    }catch {
        console.log('not a valid url');
    }
};