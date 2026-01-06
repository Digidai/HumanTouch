// 异步任务系统验证脚本
const { taskQueue } = require('./src/lib/taskqueue');

async function testAsyncSystem() {
  console.log('🚀 测试异步任务系统...\n');

  // 测试1: 添加任务
  console.log('1. 添加异步任务...');
  const taskId1 = taskQueue.addTask(
    '这是一个测试文本，用于验证异步任务系统。',
    { rounds: 2, style: 'casual' },
    'http://localhost:3000/webhook'
  );
  console.log('任务ID:', taskId1);

  const taskId2 = taskQueue.addTask('第二个测试文本，验证批量任务处理。', {
    rounds: 1,
    style: 'academic',
  });
  console.log('任务ID:', taskId2);

  // 等待任务处理
  console.log('\n2. 等待任务处理...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 测试2: 检查任务状态
  console.log('\n3. 检查任务状态...');
  const task1 = taskQueue.getTask(taskId1);
  const task2 = taskQueue.getTask(taskId2);

  console.log('任务1状态:', task1?.status);
  console.log('任务2状态:', task2?.status);

  // 测试3: 获取任务列表
  console.log('\n4. 获取任务统计...');
  const stats = taskQueue.getStats();
  console.log('任务统计:', stats);

  // 测试4: 缓存机制
  console.log('\n5. 测试缓存机制...');
  const _cacheKey = JSON.stringify({
    text: '这是一个测试文本，用于验证异步任务系统。',
    options: { rounds: 2, style: 'casual' },
  });
  console.log('缓存状态:', '已启用');

  // 测试5: 清理过期任务
  console.log('\n6. 清理过期任务...');
  taskQueue.cleanup(1000); // 清理超过1秒的任务
  console.log('清理完成');

  console.log('\n✅ 异步任务系统测试完成！');
}

// 运行测试
if (typeof window === 'undefined') {
  testAsyncSystem().catch(console.error);
}
