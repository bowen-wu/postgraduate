// g++ demo.cpp -o demo
// n 和 *p：都是“值变量”，可以赋值
// p：是“指针变量”，可以改指向
// &n：是“地址值（表达式）”，不能被赋值
// 数组不需要使用 & 来获取地址，因为数组名本身就是一个指向数组首元素的指针
// 指针运算符：* 和 &。*(p+i), *(a+i) 和 &a[i] 是等价的，都是获取数组元素的地址
// 取地址运算符：&
#include <stdio.h>
#include <math.h>
#include <string.h>
#include <stdlib.h>

int fac(int n)
{
  if (n == 1)
  {
    return 1;
  }
  return n * fac(n - 1);
}
int sum(int x, int y, int z)
{
  return fac(x) + fac(y) + fac(z);
}

void swap(int *p, int *q)
{
  int t = *p;
  *p = *q;
  *q = t;
}

void fun(int *a)
{
  for (int i = 0; i < 5; i++)
  {
    printf("%d ", *(a + i));
  }
}

struct stuff{
  int stuffId;
  float bonus;
}a[5];

int main()
{

  for (int i = 0; i < 5; i++) {
    scanf("%d %f", &a[i].stuffId, &a[i].bonus);
    printf("stuffId: %d, bonus: %.2f\n", a[i].stuffId, a[i].bonus);
  }

  struct family
  {
    char father[20];
    char mother[20];
  };

  struct student
  {
    char name[20];
    int age;
    int num;
    int score;
    struct family f;
  } Mike, Tom;

  struct
  {
    char name[20];
    int age;
    int num;
    int score;
  } Jack, Rose, stus[5];

  struct student ming, bob = {"Bob", 20, 1001, 90, {"Mike", "Mary"}};

  ming.age = 15;

  student arr[] = {ming, bob, Mike, Tom};
  arr[0].score = 100;

  struct student *a = arr;
  printf("%s\n", a->name);
  printf("%s\n", (*++a).name);
  printf("%s\n", (a + 2)->name);

  struct student *stu;
  stu = &ming;

  (*stu).age = 18;
  stu->num = 1002;

  int a = 0;

  // int a[5];
  // for (int i = 0; i < 5; i++)
  // {
  //   scanf("%d", &a[i]);
  // }

  // int *p = a;
  // for (int i = 0; i < 5; i++)
  // {
  //   printf("%d", *p);
  //   p++;
  // }

  // int a = 3, *p, *p2, arr[5]{1, 2, 3, 4, 5};
  // p = arr;
  // p2 = p;
  // int *p3 = arr;
  // char *sp = "Hello, World!";

  // p3 += 2;
  // p3 += 100;

  // int *p4 = (int*)malloc(5 * sizeof(int));

  // free(p4);

  // int arr[] = {1, 2};
  // char charArr[] = "Hello, World!";
  // puts(charArr);
  // printf("charArr length: %lu\n", strlen(charArr));

  // int a[][3] = {
  //     {1, 2},
  //     {3, 4, 3}};

  // for (int i = 0; i < sizeof(arr) / sizeof(arr[0]); i++)
  // {
  //   printf("arr[%d] = %d\n", i, arr[i]);
  // }

  // int max = 100, result = 0, i = 1;

  // while (i < max)
  // {
  //   result += i;
  //   i += 2;
  // };

  // printf("The sum of odd numbers less than %d is %d\n", max, result);

  return 0;
}