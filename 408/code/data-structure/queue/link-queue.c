#include <stdio.h>
#include <stdlib.h>

typedef struct LinkNode
{
  int data;
  struct LinkNode *next;
} LinkNode;

typedef struct LinkQueue
{
  LinkNode *head, *tail;
  int size;
} LinkQueue;

LinkQueue *InitQueue()
{
  LinkQueue *queue = (LinkQueue *)malloc(sizeof(LinkQueue));
  LinkNode *node = (LinkNode *)malloc(sizeof(LinkNode));
  node->data = -1;
  node->next = NULL;
  queue->head = node;
  queue->tail = node;

  return queue;
}

int IsEmpty(const LinkQueue *queue)
{
  if (queue->head == queue->tail)
  {
    return 1;
  }

  return 0;
}

int PushQueue(LinkQueue *queue, int ele)
{
  LinkNode *node = (LinkNode *)malloc(sizeof(LinkNode));
  if (node == NULL)
  {
    return 0;
  }

  node->data = ele;
  node->next = NULL;
  queue->tail->next = node;
  queue->tail = node;
  queue->size += 1;
  return 1;
}

int PopQueue(LinkQueue *queue, int *ele)
{
  if (IsEmpty(queue))
  {
    return 0;
  }

  LinkNode *deleteNode = queue->head->next;
  *ele = deleteNode->data;
  queue->head->next = deleteNode->next;

  // 注意：队列中只有一个节点删除时，需要移动 tail 指针
  if (queue->tail == deleteNode)
  {
    queue->tail = queue->head;
  }
  queue->size -= 1;
  free(deleteNode);

  return 1;
}

int main()
{
  LinkQueue *queue = InitQueue();
  return 1;
}