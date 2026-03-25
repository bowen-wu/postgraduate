#include <stdio.h>
#include <stdlib.h>

typedef struct LNode
{
  int data;
  struct LNode *next;
} LNode, *LinkList;
// LinkList L        LNode *L;
// 理解为什么传递 LinkList *L

int InitList(LinkList *L)
{
  L = (LNode *)malloc(sizeof(LNode));
  if (L == NULL) {
    return 0; // 内存不足，分配失败
  }
  (*L)->next = NULL;
  return 1;
};

int Empty(LinkList L)
{
  if (L->next == NULL)
  {
    return 1;
  }
  return 0;
}

int ListInsert(LinkList *L, int i, int e) {
  if (i < 1) {
    return 0;
  }

  LinkList *p = *L;
  int j = 0;
  while (p != NULL && j < i - 1) {
    *p = (*p)->next;
    j++;
  }
  if (p == NULL) {
    return 0;
  }

  LinkList *next = &(p->next);
  LNode *ele = (LNode *)malloc(sizeof(LNode));
  (*ele).data = e;

  (*p)->next = &ele;
  ele->next = &next;

  return 1;
}

int GetElem(LinkList *L, int i, LNode **e)
{
  if (i == 0)
  {
    *e = *L;
    return 1;
  }
  if (i < 1)
  {
    return 0;
  }
  LinkList p = *L;
  int j = 0;
  while (p != NULL && j < i)
  {
    p = p->next;
    j++;
  }

  if (p == NULL)
  {
    return 0;
  }
  *e = p;
  return 1;
}

int main()
{
  LNode L1_node = {1, NULL};
  LNode *L1 = &L1_node;
  L1->data = 2;

  return 0;
}
