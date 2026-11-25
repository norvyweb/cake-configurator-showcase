// A key is a character, or a command { cmd, label, width }. Width is in key units.
// Arabic rows follow the usual Arabic (101) keyboard so letters are where people expect them.

const command = (cmd, label, width = 1.5) => ({ cmd, label, width });

export const LAYOUTS = {
  ar: {
    dir: "rtl",
    rows: [
      ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "٠"],
      ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "د"],
      ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط"],
      ["ئ", "ء", "ؤ", "ر", "لا", "ى", "ة", "و", "ز", "ظ", command("backspace", "⌫")],
      [command("layout:en", "EN"), command("space", "مسافة", 5), command("enter", "تم", 2)],
    ],
  },
  en: {
    dir: "ltr",
    rows: [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
      [command("shift", "⇧"), "z", "x", "c", "v", "b", "n", "m", command("backspace", "⌫")],
      [command("layout:ar", "ع"), command("space", "space", 5), command("enter", "Done", 2)],
    ],
  },
  phone: {
    dir: "ltr", // phone numbers read left to right even on an Arabic screen
    rows: [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["+", "0", command("backspace", "⌫", 1)],
    ],
  },
};
