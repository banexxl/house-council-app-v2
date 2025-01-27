export const transliterateCyrillicToLatin = (input: string): string => {

     if (!input) return '';

     const cyrillicToLatinMap: Record<string, string> = {
          А: "A", Б: "B", В: "V", Г: "G", Д: "D", Ђ: "Đ", Е: "E", Ж: "Ž", З: "Z",
          И: "I", Ј: "J", К: "K", Л: "L", Љ: "Lj", М: "M", Н: "N", Њ: "Nj", О: "O",
          П: "P", Р: "R", С: "S", Т: "T", Ћ: "Ć", У: "U", Ф: "F", Х: "H", Ц: "C",
          Ч: "Č", Џ: "Dž", Ш: "Š",
          а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "đ", е: "e", ж: "ž", з: "z",
          и: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o",
          п: "p", р: "r", с: "s", т: "t", ћ: "ć", у: "u", ф: "f", х: "h", ц: "c",
          ч: "č", џ: "dž", ш: "š"
     };

     return input.split('').map((char: string) => cyrillicToLatinMap[char] || char).join('');
}

export const transliterateLatinToEnglish = (input: string): string => {
     const latinToEnglishMap: Record<string, string> = {
          Đ: "Dj", đ: "dj", Č: "C", č: "c", Ć: "C", ć: "c", Ž: "Z", ž: "z", Š: "S", š: "s",
     };

     return input.split('').map((char: string) => latinToEnglishMap[char] || char).join('');
}