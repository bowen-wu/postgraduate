#include <stdio.h>

// 判断队列已满/已空
// 1. 牺牲一个存储单元
// 满: (tail + 1) % MaxSize == head
// 空：tail == head

// 2. 增加一个 size 变量
// 满：size == MaxSize
// 空：size == 0

// 3. 增加一个 tag 变量，描述最近进行的是删除/插入操作
// 满：tail == head && tag == 1(插入)
// 空：tail == head && tag == 0(删除)

#define MaxSize 10
typedef struct
{
  int data[MaxSize];
  int head, tail;
} SqQueue;

SqQueue InitQueue()
{
  SqQueue queue;
  queue.head = 0;
  queue.tail = 0;
  return queue;
}

int QueueEmpty(const SqQueue *queue)
{
  if (queue->head == queue->tail)
  {
    return 1;
  }
  return 0;
}

// 牺牲一个存储单元来进行空和满的判断
int QueueFull(const SqQueue *queue)
{
  if ((queue->tail + 1) % MaxSize == queue->head)
  {
    return 1;
  }
  return 0;
}

DestroyQueue()
{
}

int PushQueue(SqQueue *queue, int ele)
{
  if (QueueFull(queue))
  {
    return 0;
  }
  queue->data[queue->tail] = ele;
  queue->tail = (queue->tail + 1) % MaxSize;
  return 1;
}

int PopQueue(SqQueue *queue, int *ele)
{
  if (QueueEmpty(queue))
  {
    return 0;
  }

  *ele = queue->data[queue->head];
  queue->head = (queue->head + 1) % MaxSize;
  return 1;
}

int GetHead(const SqQueue *queue, int *ele)
{
  if (QueueEmpty(queue))
  {
    return 0;
  }

  *ele = queue->data[queue->head];

  return 1;
}

int GetLength(const SqQueue *queue)
{
  return (queue->tail + MaxSize - queue->head) % MaxSize;
}

int main()
{
  SqQueue queue = InitQueue();
  return 1;
}