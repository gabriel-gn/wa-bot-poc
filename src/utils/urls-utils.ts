export function findAllUrlsInString(str: string): string[] {
    const regex = /(https?:\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?)/gi;
    const urls = str.match(regex) ?? [];
    return urls;
}