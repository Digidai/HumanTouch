// API测试脚本
const API_BASE = 'http://localhost:3000/api/v1';

async function testAPI() {
  console.log('🚀 开始测试HumanTouch API...\n');
  const llmKey = process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY || '';
  const useAuth = Boolean(llmKey);
  if (!useAuth) {
    console.log('⚠️ 未检测到 LLM API Key，使用公开模式进行测试。\n');
  }

  // 1. 测试用户注册
  console.log('1. 测试用户注册...');
  const registerResponse = await fetch(`${API_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    })
  });
  const registerData = await registerResponse.json();
  console.log('注册结果:', registerData.success ? '✅ 成功' : '❌ 失败');
  const apiKey = registerData.data?.api_key || 'demo-key';
  const authHeaders = useAuth ? { 'Authorization': `Bearer ${apiKey}` } : {};
  const keyPayload = useAuth ? { api_key: llmKey } : {};

  // 2. 测试内容处理
  console.log('\n2. 测试内容处理...');
  const processResponse = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({
      text: '人工智能生成的文本通常具有高度的逻辑性和一致性，缺乏人类写作中的随机性和个性化特征。这种文本往往过于规整，句式过于完美，缺乏真实人类写作中的不规则性和思维跳跃。',
      options: { rounds: 3, style: 'academic', target_score: 0.1 },
      ...keyPayload
    })
  });
  const processData = await processResponse.json();
  console.log('处理结果:', processData.success ? '✅ 成功' : '❌ 失败');
  if (processData.success) {
    console.log('AI检测分数:', processData.data.detection_scores);
    console.log('处理时间:', processData.data.processing_time, '秒');
  }

  // 3. 测试批量处理
  console.log('\n3. 测试批量处理...');
  const batchResponse = await fetch(`${API_BASE}/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({
      texts: [
        'AI生成的文本往往缺乏人类写作的自然特征。',
        '机器学习模型在语言生成方面表现出色，但仍有明显的AI痕迹。'
      ],
      options: { rounds: 2, style: 'casual' },
      ...keyPayload
    })
  });
  const batchData = await batchResponse.json();
  console.log('批量处理结果:', batchData.success ? '✅ 成功' : '❌ 失败');
  if (batchData.success) {
    console.log('处理文本数量:', batchData.data.total_processed);
    console.log('总耗时:', batchData.data.total_time, '秒');
  }

  // 4. 测试检测验证
  console.log('\n4. 测试检测验证...');
  const validateResponse = await fetch(`${API_BASE}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({
      text: '这是一个需要检测的文本样本，用于测试AI检测工具的效果。',
      detectors: ['zerogpt', 'gptzero']
    })
  });
  const validateData = await validateResponse.json();
  console.log('验证结果:', validateData.success ? '✅ 成功' : '❌ 失败');
  if (validateData.success) {
    console.log('检测结果:', validateData.data.detection_scores);
    console.log('总体评分:', validateData.data.summary);
  }

  // 5. 测试异步任务
  console.log('\n5. 测试异步任务...');
  const asyncResponse = await fetch(`${API_BASE}/async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({
      text: '这是一个需要异步处理的文本，测试长任务队列系统。',
      options: { rounds: 2, style: 'casual' },
      ...keyPayload
    })
  });
  const asyncData = await asyncResponse.json();
  console.log('异步任务结果:', asyncData.success ? '✅ 成功' : '❌ 失败');
  if (asyncData.success) {
    console.log('任务ID:', asyncData.data.task_id);
    console.log('状态:', asyncData.data.status);
    console.log('预计时间:', asyncData.data.estimated_time, '秒');

    // 等待几秒后检查任务状态
    console.log('\n6. 检查任务状态...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await fetch(`${API_BASE}/status/${asyncData.data.task_id}`, {
      headers: authHeaders
    });
    const statusData = await statusResponse.json();
    console.log('状态检查结果:', statusData.success ? '✅ 成功' : '❌ 失败');
    if (statusData.success) {
      console.log('当前状态:', statusData.data.status);
      if (statusData.data.result) {
        console.log('AI检测分数:', statusData.data.result.detection_scores);
      }
    }
  }

  console.log('\n🎉 API测试完成！');
}

// 运行测试
if (typeof window === 'undefined') {
  testAPI().catch(console.error);
}
