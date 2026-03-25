#include <stdio.h>

#define MaxSize 10
typedef struct {
  int data[MaxSize];
  int length;
}SqList;

bool ListInsert(SqList &L, int i, int e) {
  if (i < 1 || i > L.length + 1) {
    return false;
  }

  if (L.length >= MaxSize) {
    return false;
  }

  for (int j = L.length; j >= i; j--) {
    L.data[j] = L.data[j - 1];
  }

  L.data[i-1] = e;
  L.length++;
  return true;
}

bool ListDelete(SqList &L, int i, int &e) {
  if (i < 1 || i >= L.length + 1) {
    return false;
  }

  e = L.data[i - 1];

  for (int j = i; j < L.length; j++) {
    L.data[j - 1] = L.data[j];
  }
  L.data[L.length - 1] = 0;

  L.length--;
  return true;
}

bool GetElem(const SqList &L, int i, int &e) {
  if (i < 1 || i > L.length) {
    return false;
  }
  e = L.data[i - 1];

  return true;
}

bool LocalteElem(const SqList &L, int e, int &i) {
  for (int j = 0; j < L.length; j++) {
    if (L.data[j] == e) {
      i = j + 1;
      return true;
    }
  }

  i = -1;

  return false;
}

int main()
{

  return 0;
};