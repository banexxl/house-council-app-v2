export const isUUIDv4 = (str: string | undefined | null): boolean => {

     if (!str) return false;
     const uuidV4Regex = new RegExp(/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/)
     console.log('uuidV4Regex.test(str.trim())', uuidV4Regex.test(str.trim()));

     return uuidV4Regex.test(str.trim());
};
