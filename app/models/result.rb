class Result < ActiveRecord::Base
  VARIANTS = [
    %w{bubble small packed close},
    %w{normal small packed close},
    %w{bubble small packed far},
    %w{normal small packed far},
    %w{bubble small spread close},
    %w{normal small spread close},
    %w{bubble small spread far},
    %w{normal small spread far},
    %w{bubble large packed close},
    %w{normal large packed close},
    %w{bubble large packed far},
    %w{normal large packed far},
    %w{bubble large spread close},
    %w{normal large spread close},
    %w{bubble large spread far},
    %w{normal large spread far}
  ]

  def self.puts_tsv
    puts(%W[#{} user cursor size density distance errors time].join("\t"))
    id = -1
    Result.all.map {|r| r.unserialize_data}.each_with_index do |r, i|
      r.each_with_index do |p, j|
        p.each do |t|
          puts(
            (
              %W{#{id += 1} u#{i}} +
              VARIANTS[j] +
              %W{#{t['misses']} #{t['duration']}}
            ).join("\t")
          )
        end
      end
    end
    nil
  end

  serialize :data

  def unserialize_data
    ActiveSupport::JSON.decode(data)
  end
end
