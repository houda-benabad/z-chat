import { FlatList, Text, View } from 'react-native';
import { EmptyState } from '@/shared/components';
import { useThemedStyles } from '@/shared/hooks';
import { SearchResultItem } from './SearchResultItem';
import { createStyles } from './styles/SearchResultList.styles';
import type { ChatMessage } from '@/types';

interface SearchResultListProps {
  results: ChatMessage[];
  query: string;
  onResultPress: (messageId: string) => void;
}

export function SearchResultList({ results, query, onResultPress }: SearchResultListProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      {results.length === 0 && query.trim().length > 0 && (
        <EmptyState
          icon="search-outline"
          title="No messages found"
          subtitle={`No results for "${query.trim()}"`}
        />
      )}

      {results.length > 0 && (
        <>
          <Text style={styles.countLabel}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </Text>
          <FlatList
            data={results}
            keyExtractor={(m) => m.id}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={9}
            renderItem={({ item }) => (
              <SearchResultItem
                message={item}
                query={query.trim()}
                onPress={onResultPress}
              />
            )}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
          />
        </>
      )}
    </View>
  );
}
