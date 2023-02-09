import { Product } from '@vercel/commerce/types/product'
import { GetAllProductsOperation } from '@vercel/commerce/types/product'
import type { OperationContext } from '@vercel/commerce/api/operations'
import type { LocalConfig, Provider } from '../index'
import { queryData } from '../../../../../server.js'

export default function getAllProductsOperation({
  commerce,
}: OperationContext<any>) {
  async function getAllProducts<T extends GetAllProductsOperation>({
    queryString = '',
    variables,
    config,
  }: {
    queryString?: string
    variables?: T['variables']
    config?: Partial<LocalConfig>
    preview?: boolean
  } = {}): Promise<{ products: Product[] | any[] }> {
    // Query BigQuery to get products data
    const query = `WITH
    products_variants AS (
    SELECT
      parent_sku,
      item_sku,
      color_code,
      size_name,
      ARRAY_AGG( STRUCT( CONCAT("t-shirt-", CAST(parent_sku AS STRING)) AS id,
          item_sku,
          item_name ) ) AS variants
    FROM
      Reference.products
    WHERE
      parent_sku LIKE '64448%'
    GROUP BY
      parent_sku,
      id,
      item_sku,
      color_code,
      size_name,
      item_name ),
    products_variants_options AS (
    SELECT
      pr.parent_sku,
      pr.item_sku,
      pr.size_name,
      ARRAY_AGG( STRUCT( "MultipleChoiceOption" AS typename,
          "asd" AS id,
          "Size" AS displayName,
          pr.size_name,
          [STRUCT(pr.size_name AS label)] AS
        values
          ) ) AS OPTIONS
    FROM
      Reference.products pr
    JOIN
      products_variants
    ON
      pr.item_sku = products_variants.item_sku
      AND pr.size_name = products_variants.size_name
    GROUP BY
      pr.parent_sku,
      pr.item_sku,
      size_name ),
    subq_size AS (
    SELECT
      "option-size" AS id,
      "Size" AS displayName,
      pr.item_sku,
      pr.size_name,
      ARRAY_AGG( STRUCT(pr.size_name AS label,
          ["1"] AS hexColors) ) AS
    values
    FROM
      Reference.products pr
    JOIN
      products_variants
    ON
      pr.item_sku = products_variants.item_sku
      AND pr.size_name = products_variants.size_name
    GROUP BY
      1,
      2,
      3,
      4 LIMIT 1),
    subq_color AS (
    SELECT
      "option-color" AS id,
      "Color" AS displayName,
      pr.item_sku,
      pr.color_code,
      ARRAY_AGG( STRUCT( "color" AS label,
          [pr.color_code] AS hexColors ) ) AS
    values
    FROM
      Reference.products pr
    JOIN
      products_variants
    ON
      pr.item_sku = products_variants.item_sku
      AND pr.color_code = products_variants.color_code
    WHERE
      pr.color_code IS NOT NULL
    GROUP BY
      1,
      2,
      3,
      4 LIMIT 1)
  SELECT
    pa.parent_sku AS id,
    item_name_en AS name,
    brand_name AS vendor,
    "Men" as category,
    CONCAT("/", pa.parent_sku) AS path,
    pa.parent_sku AS slug,
    STRUCT(25 AS value,
      "EUR" AS currencyCode) AS price,
    "hello" AS description,
    "hello" AS descriptionHtml,
    ARRAY_AGG( STRUCT( pa.main_image_url AS url,
        "alt_text" AS altText,
        1000 AS width,
        1000 AS height ) ) AS images,
    (
    SELECT
      ARRAY_AGG( STRUCT( variant.id,
          variant.item_sku,
          variant.item_name,
          products_variants_options.options ) )
    FROM
      products_variants,
      UNNEST(variants) AS variant
    JOIN
      products_variants_options
    ON
      products_variants.item_sku = products_variants_options.item_sku
      AND products_variants.parent_sku = pa.parent_sku ) AS variants,
    (
    SELECT
      ARRAY_AGG( STRUCT( id,
          displayName,
        values
          ) ) AS OPTIONS
    FROM (
      SELECT
        id,
        displayName,
      values
      FROM
        subq_size
      UNION ALL
      SELECT
        id,
        displayName,
      values
      FROM
        subq_color ) ) AS options
  FROM
    Reference.parent pa
  JOIN
    Reference.products pr
  ON
    pa.parent_sku = pr.parent_sku
    AND pa.color_code = pr.color_code
  JOIN
    products_variants
  ON
    pr.item_sku = products_variants.item_sku
    AND pr.color_code = products_variants.color_code
    AND pr.size_name = products_variants.size_name
  JOIN
    products_variants_options
  ON
    products_variants_options.item_sku = pr.item_sku
    WHERE pa.main_image_url is not null and pa.main_image_url <> "" and brand_name is not null and brand_name <> ""
  GROUP BY
    id,
    name,
    vendor,
    path,
    slug,
    product_description_en,
    product_description_en`

    const rows = await queryData(query)

    return {
      products: rows,
    }
  }

  return getAllProducts
}
