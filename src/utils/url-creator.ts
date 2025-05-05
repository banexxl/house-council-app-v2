export const sanitizeString = (value: string) => {
     const serbianLatinToEnglish: { [key: string]: string } = {
          'č': 'c', 'ć': 'c', 'ž': 'z', 'š': 's', 'đ': 'dj',
          'Č': 'c', 'Ć': 'c', 'Ž': 'z', 'Š': 's', 'Đ': 'dj'
     };
     const serbianCyrillicToEnglish: { [key: string]: string } = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'dj', 'е': 'e', 'ж': 'z', 'з': 'z',
          'и': 'i', 'ј': 'j', 'к': 'k', 'л': 'l', 'љ': 'lj', 'м': 'm', 'н': 'n', 'њ': 'nj', 'о': 'o',
          'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'ћ': 'c', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c',
          'ч': 'c', 'џ': 'dz', 'ш': 's',
          'А': 'a', 'Б': 'b', 'В': 'v', 'Г': 'g', 'Д': 'd', 'Ђ': 'dj', 'Е': 'e', 'Ж': 'z', 'З': 'z',
          'И': 'i', 'Ј': 'j', 'К': 'k', 'Л': 'l', 'Љ': 'lj', 'М': 'm', 'Н': 'n', 'Њ': 'nj', 'О': 'o',
          'П': 'p', 'Р': 'r', 'С': 's', 'Т': 't', 'Ћ': 'c', 'У': 'u', 'Ф': 'f', 'Х': 'h', 'Ц': 'c',
          'Ч': 'c', 'Џ': 'dz', 'Ш': 's'
     };

     return value
          .split('')
          .map(char => serbianLatinToEnglish[char] || serbianCyrillicToEnglish[char] || char)
          .join('')
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove any remaining non-alphanumeric characters except spaces and hyphens
          .trim() // Trim whitespace from the start and end
          .replace(/\s+/g, '-') // Replace multiple spaces with a single hyphen
          .replace(/-+/g, '-'); // Ensure there are no multiple hyphens
}
