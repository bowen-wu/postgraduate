#include <stdio.h>

#define MAX_SIZE 10
typedef struct {
  char ch[MAX_SIZE];
  int length;
} SString;

int Compare(const SString *str1, const SString *str2) {
  int len1 = str1->length;
  int len2 = str2->length;
  int len = len1 < len2 ? len1 : len2;

  for (int i = 0; i < len; i++) {
    int result = str1->ch[i] - str2->ch[i];
    if (result != 0) {
      return result;
    }
  }

  return len1 - len2;
}

int Index(const SString *s, const SString *t) {
  if (s->length < t->length) {
    return -1;
  }

  int len = s->length;
  int length = t->length;

  // i < len - length + 1
  for (int i = 0; i < len - length + 1; i++) {
    int result = 1;
    for (int j = 0; j < length; j++) {
      if (s->ch[i+j] - t->ch[j] != 0) {
        result = 0;
        break;
      }
    }

    if (result) {
      return i;
    }
  }

  return -1;
}

int main() { return 1; }