// Debug script to test todo sync manually
console.log('🔧 DEBUG: Testing manual todo sync...');

// Simulate the sync function call
async function testSync() {
    try {
        const personalTodos = JSON.parse(localStorage.getItem('syncedPersonalTodos') || '[]');
        const agencyTodos = JSON.parse(localStorage.getItem('syncedAgencyTodos') || '[]');

        console.log('📋 Personal todos:', personalTodos);
        console.log('📋 Agency todos:', agencyTodos);

        const allTodos = [...personalTodos, ...agencyTodos];
        console.log('📋 Combined todos:', allTodos);

        const todosWithDates = allTodos.filter(todo => {
            console.log('🔍 Checking todo:', todo);
            console.log('  - targetDate:', todo.targetDate);
            console.log('  - date:', todo.date);
            console.log('  - completed:', todo.completed);
            console.log('  - has targetDate:', !!todo.targetDate);
            console.log('  - targetDate !== date:', todo.targetDate !== todo.date);
            console.log('  - not completed:', !todo.completed);

            return todo.targetDate &&
                   todo.targetDate !== todo.date &&
                   !todo.completed;
        });

        console.log('📋 Todos with dates to sync:', todosWithDates);

        // Test API call
        const response = await fetch('http://162.220.14.239:3001/api/sync-todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: 'Grant',
                todos: todosWithDates
            })
        });

        const result = await response.json();
        console.log('✅ Sync result:', result);

    } catch (error) {
        console.error('❌ Sync error:', error);
    }
}

testSync();